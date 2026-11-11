\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8200-000000000001', 'booking-trader-one@example.test'),
  ('00000000-0000-4000-8200-000000000002', 'booking-trader-two@example.test'),
  ('00000000-0000-4000-8200-000000000003', 'booking-organiser@example.test');
insert into public.seasons (slug, name, location, starts_on, ends_on, published)
  values ('booking-tests', 'Booking tests', 'High Street', current_date + 8, current_date + 10, true);
insert into public.market_days (season_slug, date, opens_at, closes_at)
  select 'booking-tests', current_date + offset_days, '10:00', '16:00' from generate_series(8, 10) as offset_days;
insert into public.market_days (season_slug, date, opens_at, closes_at)
  values ('booking-tests', current_date - 1, '10:00', '16:00');
insert into public.trading_periods (season_slug, slug, starts_on, ends_on, price_pence)
  values ('booking-tests', 'weekend', current_date + 8, current_date + 10, 12000),
    ('booking-tests', 'started', current_date - 1, current_date + 8, 12000);
insert into public.pitches (season_slug, code, zone, position)
  values ('booking-tests', 'P01', 'North row', 1), ('booking-tests', 'P02', 'North row', 2);
insert into public.pitch_days (season_slug, pitch_code, date)
  select p.season_slug, p.code, d.date from public.pitches p join public.market_days d using (season_slug)
  where p.season_slug = 'booking-tests';
insert into public.organiser_memberships (season_slug, user_id)
  values ('booking-tests', '00000000-0000-4000-8200-000000000003');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8200-000000000001', true);
do $$
begin
  if not exists (select from public.market_trading_periods where season_slug = 'booking-tests'
    and slug = 'weekend' and accepting_applications) then
    raise exception 'The future weekend is not available';
  end if;
  if exists (select from public.market_trading_periods where season_slug = 'booking-tests'
    and slug = 'started' and accepting_applications) then
    raise exception 'The dashboard shows a period that has already started';
  end if;
  begin
    perform public.submit_application('booking-tests', 'started', 'First shop', 'Craft & gifts', 'Sample ceramics', 'a@example.test');
    raise exception 'An application was accepted after the first trading day';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
select public.submit_application('booking-tests', 'weekend', 'First shop', 'Craft & gifts', 'Sample ceramics', 'a@example.test') as id \gset first_
select set_config('test.first_app', :'first_id', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8200-000000000002', true);
select public.submit_application('booking-tests', 'weekend', 'Second shop', 'Food & drink', 'Sample chocolate', 'b@example.test') as id \gset second_
select set_config('test.second_app', :'second_id', true);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8200-000000000003', true);
select public.offer_pitch(:'first_id', 'P01') as booking \gset first_
select set_config('test.first_booking', :'first_booking', true);
do $$
begin
  if (select count(*) from public.booking_days where booking_id = current_setting('test.first_booking')::uuid) <> 3 then
    raise exception 'Offer did not reserve every day';
  end if;
  begin
    perform public.offer_pitch(current_setting('test.second_app')::uuid, 'P01');
    raise exception 'Overlapping offer was accepted';
  exception when unique_violation then null;
  end;
  if exists (select from public.bookings where application_id = current_setting('test.second_app')::uuid) then
    raise exception 'Conflicting offer left a booking behind';
  end if;
  if public.review_application(current_setting('test.first_app')::uuid, 'declined', 'Unavailable') then
    raise exception 'A reserved application was declined';
  end if;
end;
$$;

select public.offer_pitch(:'second_id', 'P02') as booking \gset second_
select set_config('test.second_booking', :'second_booking', true);
select public.save_programme_item('booking-tests', null, current_date + 8, '11:00', 'Test workshop', 'Stage', false, false) as event \gset
select public.save_programme_item('booking-tests', :'event', current_date + 8, '12:00', 'Test workshop', 'Stage', false, true);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8200-000000000002', true);
do $$
begin
  if exists (select from public.bookings where id = current_setting('test.first_booking')::uuid) then
    raise exception 'Other trader could see the booking';
  end if;
  begin
    perform public.prepare_checkout(current_setting('test.first_booking')::uuid);
    raise exception 'Other trader could open Checkout';
  exception when insufficient_privilege then null;
  end;
  if has_function_privilege('public.record_checkout(uuid,uuid,text,integer,text,public.payment_status,text)', 'EXECUTE') then
    raise exception 'A trader can directly record payments';
  end if;
end;
$$;

select public.prepare_checkout(:'second_booking')->'attempt'->>'id' as attempt \gset second_
select set_config('test.second_attempt', :'second_attempt', true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8200-000000000001', true);
select public.prepare_checkout(:'first_booking')->'attempt'->>'id' as attempt \gset first_
select set_config('test.first_attempt', :'first_attempt', true);
do $$
declare prepared jsonb := public.prepare_checkout(current_setting('test.first_booking')::uuid);
begin
  if prepared->'attempt'->>'id' is distinct from current_setting('test.first_attempt') then
    raise exception 'Checkout retry created a second attempt';
  end if;
end;
$$;

reset role;
update public.trading_periods set price_pence = 9999 where season_slug = 'booking-tests';
update public.bookings set pay_by = now() - interval '3 minutes' where id in (:'first_booking', :'second_booking');
set local role service_role;
do $$
declare booking uuid := current_setting('test.first_booking')::uuid;
declare attempt uuid := current_setting('test.first_attempt')::uuid;
begin
  if public.expire_booking(booking) then raise exception 'Unresolved Checkout released its booking'; end if;
  begin
    perform public.record_checkout(booking, attempt, 'cs_test_paid', 9999, 'gbp', 'paid', 'evt_mismatch');
    raise exception 'A different amount was accepted' using errcode = 'ZX001';
  exception when raise_exception then null;
  end;
end;
$$;
select public.record_checkout(:'first_booking', :'first_attempt', 'cs_test_paid', 12000, 'gbp', 'paid', 'evt_paid');
select public.record_checkout(:'first_booking', :'first_attempt', 'cs_test_paid', 12000, 'gbp', 'paid', 'evt_paid');
select public.record_checkout(:'first_booking', :'first_attempt', 'cs_test_paid', 12000, 'gbp', 'paid', 'evt_paid_again');
select public.record_checkout(:'second_booking', :'second_attempt', 'cs_test_expired', 12000, 'gbp', 'expired', 'evt_expired');

reset role;
do $$
begin
  if (select count(*) from public.stripe_events where attempt_id = current_setting('test.first_attempt')::uuid) <> 2 then
    raise exception 'Unexpected number of recorded events';
  end if;
  if not exists (select from public.bookings where id = current_setting('test.first_booking')::uuid
    and status = 'confirmed' and price_pence = 12000) then
    raise exception 'Delayed verified payment did not confirm the original offer';
  end if;
  if not exists (select from public.bookings where id = current_setting('test.second_booking')::uuid and status = 'expired')
    or exists (select from public.booking_days where booking_id = current_setting('test.second_booking')::uuid and status <> 'expired') then
    raise exception 'Expired Checkout did not release all booking days';
  end if;
end;
$$;

set local role anon;
do $$
begin
  if (select count(*) from public.trader_listings where season_slug = 'booking-tests' and name = 'First shop') <> 1 then
    raise exception 'Confirmed trader was not published exactly once';
  end if;
  if not exists (select from public.programme_items where season_slug = 'booking-tests'
    and title = 'Test workshop' and status = 'changed' and previous_start = '11:00') then
    raise exception 'The rescheduled event was not published';
  end if;
end;
$$;
select slug from public.trader_listings where season_slug = 'booking-tests' and name = 'First shop' \gset

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8200-000000000003', true);
select public.set_listing_publication('booking-tests', :'slug', false);
set local role anon;
do $$
begin
  if exists (select from public.trader_listings where season_slug = 'booking-tests') then
    raise exception 'Hidden listing remained public';
  end if;
end;
$$;
rollback;
