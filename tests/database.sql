\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8100-000000000001', 'test-trader-one@example.test'),
  ('00000000-0000-4000-8100-000000000002', 'test-trader-two@example.test'),
  ('00000000-0000-4000-8100-000000000003', 'test-organiser@example.test');

insert into public.seasons (slug, name, location, starts_on, ends_on, published)
  values ('access-tests', 'Access tests', 'High Street', current_date + 8, current_date + 8, true);
insert into public.market_days (season_slug, date, opens_at, closes_at)
  values ('access-tests', current_date + 8, '10:00', '16:00');
insert into public.trading_periods (season_slug, slug, starts_on, ends_on, price_pence)
  values ('access-tests', 'weekend-1', current_date + 8, current_date + 8, 12000);
insert into public.organiser_memberships (season_slug, user_id)
  values ('access-tests', '00000000-0000-4000-8100-000000000003');
insert into public.programme_items (season_slug, date, starts_at, title, zone)
  values ('paisley-2026', '2026-12-04', '12:00', 'Draft for database test', 'Market stage');

set local role anon;
do $$
begin
  if not exists (select from public.trader_listings where slug = 'abbey-clay') then
    raise exception 'An anonymous visitor could not read a published listing';
  end if;
  if exists (select from public.programme_items where title = 'Draft for database test') then
    raise exception 'An anonymous visitor could read a draft event';
  end if;
  if has_table_privilege('public.applications', 'SELECT') then
    raise exception 'An anonymous visitor has access to applications';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8100-000000000001', true);
select public.submit_application(
  'access-tests', 'weekend-1', 'Test ceramics', 'Craft & gifts', 'Sample handmade ceramics', 'trader@example.test'
) as id \gset
select set_config('test.application_id', :'id', true);

do $$
begin
  if not exists (select from public.applications where id = current_setting('test.application_id')::uuid
    and status = 'submitted') then
    raise exception 'The trader could not read their submitted application';
  end if;
  begin
    perform public.submit_application(
      'access-tests', 'weekend-1', 'Changed name', 'Craft & gifts', 'Sample handmade ceramics', 'trader@example.test'
    );
    raise exception 'A duplicate application was accepted';
  exception when unique_violation then null;
  end;
  if not exists (select from public.trader_profiles where business_name = 'Test ceramics') then
    raise exception 'A duplicate submission changed the profile';
  end if;
end;
$$;

update public.trader_profiles set business_name = 'New profile name'
where user_id = '00000000-0000-4000-8100-000000000001';
do $$
begin
  if not exists (select from public.trader_profiles where business_name = 'New profile name')
    or not exists (select from public.applications where business_name = 'Test ceramics') then
    raise exception 'Updating the profile failed or changed the submitted application';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8100-000000000002', true);
do $$
declare application_id uuid := current_setting('test.application_id')::uuid;
begin
  if exists (select from public.applications where id = application_id)
    or exists (select from public.trader_profiles) then
    raise exception 'Another trader could read private data';
  end if;
  if public.review_application(application_id, 'declined', 'No longer available') then
    raise exception 'A trader could change an application decision';
  end if;
  update public.trader_profiles set business_name = 'Unauthorised edit'
    where user_id = '00000000-0000-4000-8100-000000000001';
  if found then raise exception 'A trader could update another profile'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8100-000000000003', true);
do $$
declare application_id uuid := current_setting('test.application_id')::uuid;
begin
  if not exists (select from public.applications where id = application_id) then
    raise exception 'The organiser could not read an application in their season';
  end if;
  if not public.review_application(application_id, 'under_review', '') then
    raise exception 'The organiser could not start the review';
  end if;
  if not public.review_application(application_id, 'declined', 'No longer available') then
    raise exception 'The organiser could not decline a reviewed application';
  end if;
  if public.review_application(application_id, 'under_review', '') then
    raise exception 'A final decision could be reopened';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8100-000000000001', true);
do $$
begin
  if not exists (select from public.applications where id = current_setting('test.application_id')::uuid
    and status = 'declined' and decision_note = 'No longer available') then
    raise exception 'The trader could not see the organiser’s decision';
  end if;
end;
$$;

rollback;
