create type public.booking_status as enum ('held', 'confirmed', 'expired');
create type public.payment_status as enum ('open', 'paid', 'expired', 'no_session');

create table public.pitch_days (
  season_slug text,
  pitch_code text,
  date date,
  primary key (season_slug, pitch_code, date),
  foreign key (season_slug, pitch_code) references public.pitches(season_slug, code) on delete cascade,
  foreign key (season_slug, date) references public.market_days(season_slug, date) on delete cascade
);

insert into public.pitch_days (season_slug, pitch_code, date)
select pitch.season_slug, pitch.code, day.date
from public.pitches as pitch join public.market_days as day using (season_slug)
where day.opens_at is not null;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id),
  season_slug text not null,
  pitch_code text not null,
  price_pence integer not null check (price_pence > 0),
  status public.booking_status not null default 'held',
  pay_by timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (id, season_slug, pitch_code),
  foreign key (season_slug, pitch_code) references public.pitches(season_slug, code)
);

create unique index bookings_one_active_per_application on public.bookings(application_id)
  where status in ('held', 'confirmed');
create index bookings_to_reconcile on public.bookings(pay_by) where status = 'held';

create table public.booking_days (
  booking_id uuid,
  season_slug text not null,
  pitch_code text not null,
  date date,
  status public.booking_status not null default 'held',
  primary key (booking_id, date),
  foreign key (booking_id, season_slug, pitch_code) references public.bookings(id, season_slug, pitch_code),
  foreign key (season_slug, pitch_code, date) references public.pitch_days(season_slug, pitch_code, date)
);

create unique index booking_days_one_active_per_pitch on public.booking_days(season_slug, pitch_code, date)
  where status in ('held', 'confirmed');

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  stripe_session_id text unique,
  status public.payment_status not null default 'open',
  created_at timestamptz not null default now()
);

create unique index payment_attempts_one_open on public.payment_attempts(booking_id) where status = 'open';
create index payment_attempts_booking_idx on public.payment_attempts(booking_id, created_at desc);

create table public.stripe_events (
  id text primary key,
  attempt_id uuid not null references public.payment_attempts(id),
  received_at timestamptz not null default now()
);

alter table public.trader_listings add column booking_id uuid unique references public.bookings(id);

alter table public.pitch_days enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_days enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.stripe_events enable row level security;

revoke all on public.pitch_days, public.bookings, public.booking_days, public.payment_attempts,
  public.stripe_events from public, anon, authenticated;
grant select on public.bookings, public.booking_days, public.payment_attempts to authenticated;
grant select on public.bookings, public.payment_attempts to service_role;

create policy "Read bookings in application scope" on public.bookings for select to authenticated
  using (exists (select from public.applications where id = bookings.application_id));
create policy "Read dates in booking scope" on public.booking_days for select to authenticated
  using (exists (select from public.bookings where id = booking_days.booking_id));
create policy "Read payment attempts as organiser" on public.payment_attempts for select to authenticated
  using (exists (
    select from public.bookings as booking join public.organiser_memberships as membership
      on membership.season_slug = booking.season_slug
    where booking.id = payment_attempts.booking_id and membership.user_id = (select auth.uid())
  ));

create function public.available_pitches(p_application uuid)
returns table (code text, zone text) language sql stable security definer set search_path = '' as $$
  select pitch.code, pitch.zone
  from public.applications as application
  join public.organiser_memberships as membership on membership.season_slug = application.season_slug
  join public.trading_periods as period
    on period.season_slug = application.season_slug and period.slug = application.period_slug
  join public.pitches as pitch on pitch.season_slug = application.season_slug
  where application.id = p_application and membership.user_id = (select auth.uid())
    and application.status in ('submitted', 'under_review') and period.price_pence > 0
    and not exists (select from public.bookings
      where application_id = application.id and status in ('held', 'confirmed'))
    and exists (select from public.market_days as day where day.season_slug = pitch.season_slug
      and day.date between period.starts_on and period.ends_on and day.opens_at is not null
      and (day.date + day.opens_at) at time zone 'Europe/London' > now() + interval '31 minutes')
    and not exists (
      select from public.market_days as day
      where day.season_slug = pitch.season_slug and day.date between period.starts_on and period.ends_on
        and day.opens_at is not null
        and ((day.date + day.opens_at) at time zone 'Europe/London' <= now() + interval '31 minutes'
          or not exists (select from public.pitch_days as inventory where inventory.season_slug = pitch.season_slug
            and inventory.pitch_code = pitch.code and inventory.date = day.date)
          or exists (select from public.booking_days as reserved where reserved.season_slug = pitch.season_slug
            and reserved.pitch_code = pitch.code and reserved.date = day.date
            and reserved.status in ('held', 'confirmed'))
          or exists (select from public.trader_listings as seed where seed.season_slug = pitch.season_slug
            and seed.pitch_code = pitch.code and seed.booking_id is null and day.date = any(seed.trading_dates)))
    )
  order by pitch.position;
$$;

create function public.offer_pitch(p_application uuid, p_pitch text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  application public.applications;
  period public.trading_periods;
  new_booking uuid;
  deadline timestamptz;
begin
  select a.* into application from public.applications as a
    where a.id = p_application and exists (select from public.organiser_memberships as membership
      where membership.season_slug = a.season_slug and membership.user_id = auth.uid()) for update;
  if not found then
    raise exception 'Application not available' using errcode = '42501';
  end if;
  if not exists (select from public.available_pitches(p_application) where code = p_pitch) then
    raise exception 'Pitch not available for the full period' using errcode = '23505';
  end if;
  select * into strict period from public.trading_periods
    where season_slug = application.season_slug and slug = application.period_slug;
  select date_trunc('second', least(now() + interval '24 hours', min(
    (day.date + day.opens_at) at time zone 'Europe/London'
  ))) into deadline from public.market_days as day where day.season_slug = period.season_slug
    and day.date between period.starts_on and period.ends_on and day.opens_at is not null;

  insert into public.bookings (application_id, season_slug, pitch_code, price_pence, pay_by)
    values (application.id, application.season_slug, p_pitch, period.price_pence, deadline)
    returning id into new_booking;
  insert into public.booking_days (booking_id, season_slug, pitch_code, date)
    select new_booking, application.season_slug, p_pitch, day.date
    from public.market_days as day where day.season_slug = application.season_slug
      and day.date between period.starts_on and period.ends_on and day.opens_at is not null
    order by day.date;
  update public.applications set status = 'under_review', updated_at = now() where id = application.id;
  return new_booking;
end;
$$;

create or replace function public.review_application(p_id uuid, p_status public.application_status, p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform from public.applications as application where id = p_id
    and exists (select from public.organiser_memberships as membership
      where membership.season_slug = application.season_slug and membership.user_id = auth.uid()) for update;
  if not found then return false; end if;
  update public.applications as application
    set status = p_status, decision_note = case when p_status = 'declined' then trim(p_note) end, updated_at = now()
    where application.id = p_id
      and ((p_status = 'under_review' and application.status = 'submitted')
        or (p_status = 'declined' and application.status in ('submitted', 'under_review')))
      and not exists (select from public.bookings where application_id = p_id and status in ('held', 'confirmed'));
  return found;
end;
$$;

create function public.prepare_checkout(p_booking uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings;
  attempt public.payment_attempts;
begin
  select b.* into booking from public.bookings as b
    join public.applications as application on application.id = b.application_id
    where b.id = p_booking and application.trader_id = auth.uid() for update of b;
  if not found then raise exception 'Booking not available' using errcode = '42501'; end if;
  if booking.status <> 'held' or booking.pay_by <= now() then return null; end if;
  select * into attempt from public.payment_attempts where booking_id = booking.id and status = 'open';
  if not found then
    if booking.pay_by <= now() + interval '31 minutes' then return null; end if;
    insert into public.payment_attempts (booking_id) values (booking.id) returning * into attempt;
  end if;
  return jsonb_build_object('booking', to_jsonb(booking), 'attempt', to_jsonb(attempt));
end;
$$;

create function public.expire_booking(p_booking uuid, p_missing_attempt uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform from public.bookings where id = p_booking and status = 'held'
    and pay_by <= now() - case when p_missing_attempt is not null then interval '2 minutes' else interval '0' end
    for update;
  if not found then return false; end if;
  if p_missing_attempt is not null then
    update public.payment_attempts set status = 'no_session' where id = p_missing_attempt
      and booking_id = p_booking and stripe_session_id is null and status = 'open';
  end if;
  if exists (select from public.payment_attempts where booking_id = p_booking and status in ('open', 'paid'))
    then return false;
  end if;
  update public.booking_days set status = 'expired' where booking_id = p_booking;
  update public.bookings set status = 'expired' where id = p_booking;
  return true;
end;
$$;

create function public.record_checkout(
  p_booking uuid, p_attempt uuid, p_session text, p_amount integer, p_currency text,
  p_status public.payment_status, p_event text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings;
  attempt public.payment_attempts;
begin
  select * into strict booking from public.bookings where id = p_booking for update;
  select * into strict attempt from public.payment_attempts where id = p_attempt and booking_id = p_booking;
  if p_amount is distinct from booking.price_pence or p_currency is distinct from 'gbp'
    or coalesce(p_session, '') !~ '^cs_test_[[:alnum:]_]+$'
    or (attempt.stripe_session_id is not null and attempt.stripe_session_id <> p_session)
    or p_status is null or p_status = 'no_session'
  then raise exception 'Checkout does not match booking'; end if;

  if p_event is not null then
    insert into public.stripe_events (id, attempt_id) values (p_event, p_attempt) on conflict do nothing;
    if not found then return; end if;
  end if;
  if attempt.status = p_status and attempt.stripe_session_id = p_session then return; end if;
  if p_status = 'open' and attempt.status <> 'open' then return; end if;
  if attempt.status <> 'open' or booking.status <> 'held' then
    raise exception 'Checkout is already settled';
  end if;

  update public.payment_attempts set status = p_status, stripe_session_id = p_session where id = p_attempt;
  if p_status = 'paid' then
    update public.booking_days set status = 'confirmed' where booking_id = p_booking;
    update public.bookings set status = 'confirmed', confirmed_at = now() where id = p_booking;
    insert into public.trader_listings (
      season_slug, slug, name, category, description, pitch_code, trading_dates, booking_id, published
    ) select booking.season_slug,
      coalesce(nullif(trim(both '-' from regexp_replace(lower(application.business_name), '[^a-z0-9]+', '-', 'g')), ''), 'stall')
        || '-' || gen_random_uuid()::text,
      application.business_name, application.category,
      application.description, booking.pitch_code,
      array(select date from public.booking_days where booking_id = p_booking order by date), p_booking, true
    from public.applications as application where application.id = booking.application_id;
  elsif p_status = 'expired' then
    perform public.expire_booking(p_booking);
  end if;
end;
$$;

revoke all on function public.available_pitches(uuid), public.offer_pitch(uuid, text),
  public.prepare_checkout(uuid), public.expire_booking(uuid, uuid),
  public.record_checkout(uuid, uuid, text, integer, text, public.payment_status, text)
  from public, anon, authenticated;
grant execute on function public.available_pitches(uuid), public.offer_pitch(uuid, text),
  public.prepare_checkout(uuid) to authenticated;
grant execute on function public.expire_booking(uuid, uuid),
  public.record_checkout(uuid, uuid, text, integer, text, public.payment_status, text) to service_role;
