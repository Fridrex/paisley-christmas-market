alter table public.trader_profiles add constraint demo_profile_email
  check (contact_email ~* '^[^[:space:]@]+@example[.]test$') not valid;
alter table public.applications add constraint demo_application_email
  check (contact_email ~* '^[^[:space:]@]+@example[.]test$') not valid;

alter table public.applications
  add column listing_permission_at timestamptz,
  add column listing_permission_version text,
  add column listing_withdrawn_at timestamptz;

create schema if not exists private;

create function private.hide_new_booking_listing() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.booking_id is not null then
    new.published := false;
  end if;
  return new;
end;
$$;

revoke all on function private.hide_new_booking_listing() from public, anon, authenticated;
create trigger hide_new_booking_listing before insert on public.trader_listings
  for each row execute function private.hide_new_booking_listing();

update public.trader_listings set published = false where booking_id is not null and published;

create function public.set_my_listing_permission(p_application uuid, p_allow boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_allow is null or auth.uid() is null then return false; end if;

  update public.applications as application
    set listing_permission_at = case
          when p_allow and application.listing_withdrawn_at is null
            then coalesce(application.listing_permission_at, now())
          when p_allow then now()
          else application.listing_permission_at
        end,
        listing_permission_version = case when p_allow then 'demo-listing-v1' else application.listing_permission_version end,
        listing_withdrawn_at = case when p_allow then null else coalesce(application.listing_withdrawn_at, now()) end
    where application.id = p_application and application.trader_id = auth.uid();
  if not found then return false; end if;

  if not p_allow then
    update public.trader_listings as listing set published = false
      from public.bookings as booking
      where listing.booking_id = booking.id and booking.application_id = p_application and listing.published;
  end if;
  return true;
end;
$$;

create or replace function public.set_listing_publication(p_season text, p_slug text, p_published boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  application_id uuid;
  allowed boolean;
begin
  if p_published is null or not exists (
    select 1 from public.organiser_memberships where season_slug = p_season and user_id = auth.uid()
  ) then return false; end if;

  select booking.application_id into application_id
    from public.trader_listings as listing
    left join public.bookings as booking on booking.id = listing.booking_id
    where listing.season_slug = p_season and listing.slug = p_slug;
  if not found then return false; end if;

  if p_published and application_id is not null then
    select listing_permission_at is not null and listing_withdrawn_at is null into allowed
      from public.applications where id = application_id for update;
    if allowed is distinct from true then return false; end if;
  end if;

  update public.trader_listings set published = p_published where season_slug = p_season and slug = p_slug;
  return found;
end;
$$;

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('access', 'correction', 'erasure', 'restriction', 'objection', 'portability')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index privacy_requests_user_created on public.privacy_requests (user_id, created_at desc);
create index privacy_requests_completed on public.privacy_requests (completed_at) where completed_at is not null;
create unique index privacy_requests_one_open_per_kind on public.privacy_requests (user_id, kind)
  where completed_at is null;

alter table public.privacy_requests enable row level security;
revoke all on public.privacy_requests from public, anon, authenticated;
grant select on public.privacy_requests to authenticated;
create policy "Read own privacy requests" on public.privacy_requests
  for select to authenticated using (user_id = (select auth.uid()));

create function public.request_privacy(p_kind text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return false; end if;
  insert into public.privacy_requests (user_id, kind) values (auth.uid(), p_kind)
    on conflict (user_id, kind) where completed_at is null do nothing;
  return found;
end;
$$;

create function public.get_my_privacy_data() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'account', jsonb_build_object('id', account.id, 'email', account.email, 'created_at', account.created_at),
    'profile', (select to_jsonb(p) from public.trader_profiles p where p.user_id = account.id),
    'applications', coalesce((
      select jsonb_agg(to_jsonb(a) || jsonb_build_object('bookings', coalesce((
        select jsonb_agg(to_jsonb(b) || jsonb_build_object(
          'days', coalesce((select jsonb_agg(to_jsonb(d) order by d.date) from public.booking_days d where d.booking_id = b.id), '[]'),
          'payments', coalesce((
            select jsonb_agg(jsonb_build_object('status', p.status, 'created_at', p.created_at) order by p.created_at)
              from public.payment_attempts p where p.booking_id = b.id
          ), '[]'),
          'listing', (select to_jsonb(l) from public.trader_listings l where l.booking_id = b.id)
        ) order by b.created_at) from public.bookings b where b.application_id = a.id
      ), '[]')) order by a.created_at)
        from public.applications a where a.trader_id = account.id
    ), '[]'),
    'requests', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at) from public.privacy_requests r where r.user_id = account.id
    ), '[]')
  )
  from auth.users as account where account.id = (select auth.uid());
$$;

create function public.erase_demo_account(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  booking_ids uuid[];
begin
  perform 1 from auth.users where id = p_user and email ~* '^[^[:space:]@]+@example[.]test$' for update;
  if not found or exists (select 1 from public.organiser_memberships where user_id = p_user) then return false; end if;

  perform 1 from public.applications where trader_id = p_user for update;
  perform 1 from public.bookings b join public.applications a on a.id = b.application_id
    where a.trader_id = p_user for update of b;
  if exists (
    select 1 from public.bookings b join public.applications a on a.id = b.application_id
      where a.trader_id = p_user and (b.status = 'held' or (b.status = 'confirmed' and exists (
        select 1 from public.booking_days d where d.booking_id = b.id and d.date >= (now() at time zone 'Europe/London')::date
      )))
  ) then return false; end if;

  select coalesce(array_agg(b.id), '{}') into booking_ids
    from public.bookings b join public.applications a on a.id = b.application_id where a.trader_id = p_user;
  delete from public.stripe_events e using public.payment_attempts p where e.attempt_id = p.id and p.booking_id = any(booking_ids);
  delete from public.payment_attempts where booking_id = any(booking_ids);
  delete from public.trader_listings where booking_id = any(booking_ids);
  delete from public.booking_days where booking_id = any(booking_ids);
  delete from public.bookings where id = any(booking_ids);
  delete from auth.users where id = p_user;
  return found;
end;
$$;

create function public.purge_expired_demo_data() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  candidate uuid;
  removed integer := 0;
  today date := (now() at time zone 'Europe/London')::date;
begin
  delete from public.privacy_requests where completed_at < now() - interval '30 days';
  if not exists (select 1 from public.seasons where slug = 'paisley-2026' and is_demo and ends_on + 30 <= today) then
    return 0;
  end if;

  for candidate in
    select u.id from auth.users u
      where u.email ~* '^[^[:space:]@]+@example[.]test$'
        and not exists (select 1 from public.organiser_memberships m where m.user_id = u.id)
        and not exists (select 1 from public.privacy_requests r where r.user_id = u.id and r.completed_at is null)
        and not exists (
          select 1 from public.applications a join public.seasons s on s.slug = a.season_slug
            where a.trader_id = u.id and (not s.is_demo or s.ends_on + 30 > today)
        )
        and not exists (
          select 1 from public.applications a join public.bookings b on b.application_id = a.id
            where a.trader_id = u.id and b.status = 'held'
        )
      order by u.id limit 30 for update of u skip locked
  loop
    if not exists (select 1 from public.privacy_requests where user_id = candidate and completed_at is null)
      and public.erase_demo_account(candidate) then
      removed := removed + 1;
    end if;
  end loop;
  return removed;
end;
$$;

revoke all on function public.set_my_listing_permission(uuid, boolean), public.request_privacy(text),
  public.get_my_privacy_data(), public.erase_demo_account(uuid), public.purge_expired_demo_data()
  from public, anon, authenticated, service_role;
grant execute on function public.set_my_listing_permission(uuid, boolean), public.request_privacy(text),
  public.get_my_privacy_data() to authenticated;
grant execute on function public.erase_demo_account(uuid), public.purge_expired_demo_data() to service_role;
