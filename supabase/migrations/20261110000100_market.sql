create type public.trader_category as enum ('Craft & gifts', 'Food & drink', 'Home & decor');
create type public.programme_status as enum ('scheduled', 'changed', 'cancelled');
create type public.application_status as enum ('submitted', 'under_review', 'declined');

create table public.seasons (
  slug text primary key,
  name text not null,
  location text not null,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  is_demo boolean not null default false,
  published boolean not null default false
);

create table public.market_days (
  season_slug text references public.seasons(slug) on delete cascade,
  date date not null,
  opens_at time,
  closes_at time,
  primary key (season_slug, date),
  check ((opens_at is null and closes_at is null)
    or (opens_at is not null and closes_at is not null and closes_at > opens_at))
);

create table public.trading_periods (
  season_slug text references public.seasons(slug) on delete cascade,
  slug text,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  price_pence integer not null check (price_pence >= 0),
  accepting_applications boolean not null default true,
  primary key (season_slug, slug),
  foreign key (season_slug, starts_on) references public.market_days(season_slug, date),
  foreign key (season_slug, ends_on) references public.market_days(season_slug, date)
);

create table public.programme_items (
  id uuid primary key default gen_random_uuid(),
  season_slug text not null,
  date date not null,
  starts_at time not null,
  previous_start time,
  title text not null,
  zone text not null,
  status public.programme_status not null default 'scheduled',
  published boolean not null default false,
  foreign key (season_slug, date) references public.market_days(season_slug, date) on delete cascade,
  check (status <> 'changed' or (previous_start is not null and previous_start <> starts_at))
);

create table public.pitches (
  season_slug text references public.seasons(slug) on delete cascade,
  code text check (code ~ '^[A-Z0-9-]{1,12}$'),
  zone text not null,
  position integer not null check (position > 0),
  primary key (season_slug, code),
  unique (season_slug, position)
);

create table public.trader_listings (
  season_slug text not null,
  slug text check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category public.trader_category not null,
  description text not null,
  pitch_code text not null,
  trading_dates date[] not null check (cardinality(trading_dates) > 0 and array_position(trading_dates, null) is null),
  published boolean not null default false,
  primary key (season_slug, slug),
  foreign key (season_slug, pitch_code) references public.pitches(season_slug, code)
);

create table public.organiser_memberships (
  season_slug text references public.seasons(slug) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (season_slug, user_id)
);

create table public.trader_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null check (char_length(trim(business_name)) between 2 and 60),
  category public.trader_category not null,
  description text not null check (char_length(trim(description)) between 10 and 500),
  contact_email text not null check (char_length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  season_slug text not null,
  period_slug text not null,
  trader_id uuid not null references public.trader_profiles(user_id) on delete cascade,
  business_name text not null check (char_length(trim(business_name)) between 2 and 60),
  category public.trader_category not null,
  description text not null check (char_length(trim(description)) between 10 and 500),
  contact_email text not null check (char_length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  status public.application_status not null default 'submitted',
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (season_slug, period_slug) references public.trading_periods(season_slug, slug),
  unique (trader_id, season_slug, period_slug),
  check (status <> 'declined' or coalesce(char_length(trim(decision_note)), 0) between 3 and 500)
);

create index applications_season_created_idx on public.applications(season_slug, created_at desc);
create index programme_items_season_date_idx on public.programme_items(season_slug, date, starts_at);

alter table public.seasons enable row level security;
alter table public.market_days enable row level security;
alter table public.trading_periods enable row level security;
alter table public.programme_items enable row level security;
alter table public.pitches enable row level security;
alter table public.trader_listings enable row level security;
alter table public.organiser_memberships enable row level security;
alter table public.trader_profiles enable row level security;
alter table public.applications enable row level security;

revoke all on public.seasons, public.market_days, public.trading_periods, public.programme_items,
  public.pitches, public.trader_listings, public.organiser_memberships, public.trader_profiles,
  public.applications from anon, authenticated;
grant select on public.seasons, public.market_days, public.trading_periods, public.programme_items,
  public.pitches, public.trader_listings to anon, authenticated;
grant select on public.organiser_memberships, public.trader_profiles, public.applications to authenticated;

create policy "Read published seasons" on public.seasons
  for select to anon, authenticated using (published);
create policy "Read public opening hours" on public.market_days
  for select to anon, authenticated using (exists (select 1 from public.seasons where slug = season_slug));
create policy "Read public trading periods" on public.trading_periods
  for select to anon, authenticated using (exists (select 1 from public.seasons where slug = season_slug));
create policy "Read published programme" on public.programme_items
  for select to anon, authenticated using (published and exists (select 1 from public.seasons where slug = season_slug));
create policy "Read public map" on public.pitches
  for select to anon, authenticated using (exists (select 1 from public.seasons where slug = season_slug));
create policy "Read published listings" on public.trader_listings
  for select to anon, authenticated using (published and exists (select 1 from public.seasons where slug = season_slug));

create policy "Read own organiser membership" on public.organiser_memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Read own trader profile" on public.trader_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Read applications in scope" on public.applications
  for select to authenticated using (
    trader_id = (select auth.uid())
    or exists (
      select 1 from public.organiser_memberships as membership
      where membership.season_slug = applications.season_slug and membership.user_id = (select auth.uid())
    )
  );

create function public.submit_application(
  p_season text, p_period text, p_name text, p_category public.trader_category, p_description text, p_email text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  application_id uuid;
begin
  if actor is null then
    raise exception 'Sign in to submit an application' using errcode = '42501';
  end if;
  perform 1 from public.trading_periods as period
    join public.seasons as season on season.slug = period.season_slug
    where period.season_slug = p_season and period.slug = p_period
      and period.accepting_applications and season.published
    for share of period, season;
  if not found then
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

create function public.review_application(p_id uuid, p_status public.application_status, p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.applications as application
    set status = p_status, decision_note = case when p_status = 'declined' then trim(p_note) end,
      updated_at = now()
    where application.id = p_id
      and ((p_status = 'under_review' and application.status = 'submitted')
        or (p_status = 'declined' and application.status in ('submitted', 'under_review')))
      and exists (
        select 1 from public.organiser_memberships as membership
        where membership.season_slug = application.season_slug and membership.user_id = auth.uid()
      );
  return found;
end;
$$;

revoke all on function public.submit_application(text, text, text, public.trader_category, text, text) from public, anon, authenticated;
revoke all on function public.review_application(uuid, public.application_status, text) from public, anon, authenticated;
grant execute on function public.submit_application(text, text, text, public.trader_category, text, text) to authenticated;
grant execute on function public.review_application(uuid, public.application_status, text) to authenticated;
