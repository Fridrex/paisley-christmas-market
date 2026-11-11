create view public.market_trading_periods with (security_invoker = true) as
select period.season_slug, period.slug, period.starts_on, period.ends_on, period.price_pence,
  period.accepting_applications and period.price_pence > 0 and coalesce(
    (opening.date + opening.opens_at) at time zone 'Europe/London' > now() + interval '31 minutes',
    false
  ) as accepting_applications
from public.trading_periods as period
left join lateral (
  select day.date, day.opens_at
  from public.market_days as day
  where day.season_slug = period.season_slug and day.date between period.starts_on and period.ends_on
    and day.opens_at is not null
  order by day.date
  limit 1
) as opening on true;

revoke all on public.market_trading_periods from public, anon, authenticated;
grant select on public.market_trading_periods to authenticated;

create or replace function public.submit_application(
  p_season text, p_period text, p_name text, p_category public.trader_category, p_description text, p_email text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  application_id uuid;
begin
  if actor is null then
    raise exception 'Sign in to submit an application' using errcode = '42501';
  end if;
  perform from public.trading_periods as period
    join public.seasons as season on season.slug = period.season_slug
    where period.season_slug = p_season and period.slug = p_period
      and period.accepting_applications and season.published
    for share of period, season;
  if not found or not exists (
    select from public.market_trading_periods
    where season_slug = p_season and slug = p_period and accepting_applications
  ) then
    raise exception 'This trading period is closed' using errcode = '22023';
  end if;

  insert into public.trader_profiles (user_id, business_name, category, description, contact_email)
    values (actor, trim(p_name), p_category, trim(p_description), trim(p_email))
    on conflict (user_id) do update set business_name = excluded.business_name,
      category = excluded.category, description = excluded.description, contact_email = excluded.contact_email;

  insert into public.applications (season_slug, period_slug, trader_id, business_name, category, description, contact_email)
    values (p_season, p_period, actor, trim(p_name), p_category, trim(p_description), trim(p_email))
    returning id into application_id;
  return application_id;
end;
$$;

create index bookings_application_history_idx on public.bookings(application_id, created_at desc);
