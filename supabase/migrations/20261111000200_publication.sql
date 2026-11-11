revoke select on public.trader_listings from anon, authenticated;
grant select (season_slug, slug, name, category, description, pitch_code, trading_dates)
  on public.trader_listings to anon, authenticated;
grant select (published) on public.trader_listings to authenticated;

create policy "Organisers read programme drafts" on public.programme_items for select to authenticated
  using (exists (select from public.organiser_memberships as membership
    where membership.season_slug = programme_items.season_slug and membership.user_id = (select auth.uid())));

create policy "Organisers read unpublished listings" on public.trader_listings for select to authenticated
  using (exists (select from public.organiser_memberships as membership
    where membership.season_slug = trader_listings.season_slug and membership.user_id = (select auth.uid())));

create function public.save_programme_item(
  p_season text, p_id uuid, p_date date, p_time time, p_title text, p_zone text,
  p_cancelled boolean, p_published boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  previous public.programme_items;
  hours public.market_days;
  next_status public.programme_status;
  prior_time time;
  event_id uuid;
begin
  if not exists (select from public.organiser_memberships where season_slug = p_season and user_id = auth.uid())
    then raise exception 'Organiser access required' using errcode = '42501';
  end if;
  if coalesce(char_length(trim(p_title)), 0) not between 2 and 100
    or coalesce(char_length(trim(p_zone)), 0) not between 2 and 80
    then raise exception 'Event title or location is invalid' using errcode = '22023';
  end if;
  select * into hours from public.market_days where season_slug = p_season and date = p_date;
  if not found or hours.opens_at is null or p_time is null or p_time < hours.opens_at or p_time >= hours.closes_at
    then raise exception 'Event must start during market hours' using errcode = '22023';
  end if;

  if p_id is not null then
    select * into previous from public.programme_items where id = p_id and season_slug = p_season for update;
    if not found then raise exception 'Event not found' using errcode = '22023'; end if;
  end if;
  prior_time := case when previous.starts_at <> p_time then previous.starts_at else previous.previous_start end;
  next_status := case when p_cancelled then 'cancelled'
    when prior_time is not null and prior_time <> p_time then 'changed' else 'scheduled' end;

  if p_id is null then
    insert into public.programme_items (season_slug, date, starts_at, title, zone, status, published)
      values (p_season, p_date, p_time, trim(p_title), trim(p_zone), next_status, p_published)
      returning id into event_id;
  else
    update public.programme_items set date = p_date, starts_at = p_time, title = trim(p_title), zone = trim(p_zone),
      status = next_status, previous_start = prior_time, published = p_published
      where id = p_id returning id into event_id;
  end if;
  return event_id;
end;
$$;

create function public.set_listing_publication(p_season text, p_slug text, p_published boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.trader_listings as listing set published = p_published
    where listing.season_slug = p_season and listing.slug = p_slug
      and exists (select from public.organiser_memberships where season_slug = p_season and user_id = auth.uid());
  return found;
end;
$$;

revoke all on function public.save_programme_item(text, uuid, date, time, text, text, boolean, boolean),
  public.set_listing_publication(text, text, boolean) from public, anon, authenticated;
grant execute on function public.save_programme_item(text, uuid, date, time, text, text, boolean, boolean),
  public.set_listing_publication(text, text, boolean) to authenticated;
