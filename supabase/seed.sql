-- Public sample data for the December 2026 demo season.
begin;

insert into public.seasons (slug, name, location, starts_on, ends_on, is_demo, published) values
  ('paisley-2026', 'Paisley Christmas Market', 'Paisley High Street', '2026-12-04', '2026-12-20', true, true);

insert into public.market_days (season_slug, date, opens_at, closes_at) values
  ('paisley-2026', '2026-12-04', '10:00', '16:00'),
  ('paisley-2026', '2026-12-05', '10:00', '16:00'),
  ('paisley-2026', '2026-12-06', '10:00', '16:00'),
  ('paisley-2026', '2026-12-07', null, null),
  ('paisley-2026', '2026-12-08', null, null),
  ('paisley-2026', '2026-12-09', null, null),
  ('paisley-2026', '2026-12-10', null, null),
  ('paisley-2026', '2026-12-11', '10:00', '16:00'),
  ('paisley-2026', '2026-12-12', '10:00', '16:00'),
  ('paisley-2026', '2026-12-13', '10:00', '16:00'),
  ('paisley-2026', '2026-12-14', null, null),
  ('paisley-2026', '2026-12-15', null, null),
  ('paisley-2026', '2026-12-16', null, null),
  ('paisley-2026', '2026-12-17', null, null),
  ('paisley-2026', '2026-12-18', '10:00', '16:00'),
  ('paisley-2026', '2026-12-19', '10:00', '16:00'),
  ('paisley-2026', '2026-12-20', '10:00', '16:00');

insert into public.trading_periods (season_slug, slug, starts_on, ends_on, price_pence) values
  ('paisley-2026', 'weekend-1', '2026-12-04', '2026-12-06', 12000),
  ('paisley-2026', 'weekend-2', '2026-12-11', '2026-12-13', 12000),
  ('paisley-2026', 'weekend-3', '2026-12-18', '2026-12-20', 12000);

insert into public.programme_items (season_slug, id, date, starts_at, title, zone, status, previous_start, published) values
  ('paisley-2026', '00000000-0000-4000-8000-000000000001', '2026-12-04', '10:00', 'Market opens', 'High Street', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000002', '2026-12-04', '12:15', 'Acoustic set', 'Market stage', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000003', '2026-12-04', '14:00', 'Paper star workshop', 'Makers’ tent', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000004', '2026-12-05', '10:30', 'Winter wreath workshop', 'Makers’ tent', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000005', '2026-12-05', '12:30', 'Christmas brass', 'Market stage', 'changed', '12:00', true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000006', '2026-12-05', '14:30', 'Festive stories', 'Makers’ tent', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000007', '2026-12-06', '11:00', 'Festive fiddle set', 'Market stage', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000008', '2026-12-06', '13:00', 'Print a gift tag', 'Makers’ tent', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000009', '2026-12-06', '15:00', 'Sunday carols', 'Market stage', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000010', '2026-12-12', '13:00', 'Lantern-making workshop', 'Makers’ tent', 'cancelled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000011', '2026-12-13', '14:00', 'Winter folk songs', 'Market stage', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000012', '2026-12-19', '11:30', 'Christmas card printing', 'Makers’ tent', 'scheduled', null, true),
  ('paisley-2026', '00000000-0000-4000-8000-000000000013', '2026-12-20', '15:00', 'Closing carols', 'Market stage', 'scheduled', null, true);

insert into public.pitches (season_slug, code, zone, position) values
  ('paisley-2026', 'A01', 'North row', 1),
  ('paisley-2026', 'A02', 'North row', 2),
  ('paisley-2026', 'A03', 'North row', 3),
  ('paisley-2026', 'B01', 'South row', 4),
  ('paisley-2026', 'B02', 'South row', 5),
  ('paisley-2026', 'B03', 'South row', 6);

insert into public.trader_listings (season_slug, slug, name, category, description, pitch_code, trading_dates, published) values
  ('paisley-2026', 'abbey-clay', 'Abbey Clay', 'Craft & gifts', 'Hand-thrown ceramic mugs, bowls and small dishes in winter glazes.', 'A01', array['2026-12-04', '2026-12-05', '2026-12-06', '2026-12-18', '2026-12-19', '2026-12-20']::date[], true),
  ('paisley-2026', 'the-fudge-room', 'The Fudge Room', 'Food & drink', 'Small-batch Scottish fudge, including tablet and sea-salt flavours.', 'A02', array['2026-12-04', '2026-12-05', '2026-12-06', '2026-12-11', '2026-12-12', '2026-12-13', '2026-12-18', '2026-12-19', '2026-12-20']::date[], true),
  ('paisley-2026', 'pine-and-thread', 'Pine & Thread', 'Home & decor', 'Evergreen wreaths, hand-stitched decorations and winter textiles.', 'A03', array['2026-12-04', '2026-12-05', '2026-12-06']::date[], true),
  ('paisley-2026', 'west-end-press', 'West End Press', 'Craft & gifts', 'Illustrated cards, hand-printed gift wrap and prints inspired by Paisley.', 'B01', array['2026-12-11', '2026-12-12', '2026-12-13', '2026-12-18', '2026-12-19', '2026-12-20']::date[], true),
  ('paisley-2026', 'gilmour-cocoa', 'Gilmour Cocoa', 'Food & drink', 'Hot chocolate by the cup and boxes of handmade truffles.', 'B03', array['2026-12-04', '2026-12-05', '2026-12-06', '2026-12-11', '2026-12-12', '2026-12-13']::date[], true);

insert into public.pitch_days (season_slug, pitch_code, date)
select pitch.season_slug, pitch.code, day.date
from public.pitches as pitch join public.market_days as day using (season_slug)
where day.opens_at is not null
on conflict do nothing;

commit;
