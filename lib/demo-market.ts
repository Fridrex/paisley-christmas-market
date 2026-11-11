import { type Market, type ProgrammeItem, seasonSlug } from './market-data';

const weekends = [
  ['2026-12-04', '2026-12-05', '2026-12-06'],
  ['2026-12-11', '2026-12-12', '2026-12-13'],
  ['2026-12-18', '2026-12-19', '2026-12-20'],
];
const openDates = weekends.flat();
const [opening, middle, closing] = weekends;

const eventRows: [string, string, string, string, ProgrammeItem['status']?, string?][] = [
  [opening[0], '10:00', 'Market opens', 'High Street'],
  [opening[0], '12:15', 'Acoustic set', 'Market stage'],
  [opening[0], '14:00', 'Paper star workshop', 'Makers’ tent'],
  [opening[1], '10:30', 'Winter wreath workshop', 'Makers’ tent'],
  [opening[1], '12:30', 'Christmas brass', 'Market stage', 'changed', '12:00'],
  [opening[1], '14:30', 'Festive stories', 'Makers’ tent'],
  [opening[2], '11:00', 'Festive fiddle set', 'Market stage'],
  [opening[2], '13:00', 'Print a gift tag', 'Makers’ tent'],
  [opening[2], '15:00', 'Sunday carols', 'Market stage'],
  [middle[1], '13:00', 'Lantern-making workshop', 'Makers’ tent', 'cancelled'],
  [middle[2], '14:00', 'Winter folk songs', 'Market stage'],
  [closing[1], '11:30', 'Christmas card printing', 'Makers’ tent'],
  [closing[2], '15:00', 'Closing carols', 'Market stage'],
];

export const demoMarket: Market = {
  season: {
    slug: seasonSlug, name: 'Paisley Christmas Market', location: 'Paisley High Street',
    starts_on: opening[0], ends_on: closing[2], is_demo: true,
  },
  days: Array.from({ length: 17 }, (_, index) => {
    const date = `2026-12-${String(index + 4).padStart(2, '0')}`;
    return openDates.includes(date)
      ? { date, opens_at: '10:00', closes_at: '16:00' }
      : { date, opens_at: null, closes_at: null };
  }),
  periods: weekends.map((dates, index) => ({
    slug: `weekend-${index + 1}`, starts_on: dates[0], ends_on: dates[2], price_pence: 12000,
  })),
  programme: eventRows.map(([date, starts_at, title, zone, status = 'scheduled', previous_start], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    date, starts_at, title, zone, status, previous_start: previous_start ?? null,
  })),
  pitches: ['A01', 'A02', 'A03', 'B01', 'B02', 'B03'].map((code, index) => ({
    code, zone: index < 3 ? 'North row' : 'South row', position: index + 1,
  })),
  traders: [
    { slug: 'abbey-clay', name: 'Abbey Clay', category: 'Craft & gifts',
      description: 'Hand-thrown ceramic mugs, bowls and small dishes in winter glazes.',
      pitch_code: 'A01', trading_dates: [...opening, ...closing] },
    { slug: 'the-fudge-room', name: 'The Fudge Room', category: 'Food & drink',
      description: 'Small-batch Scottish fudge, including tablet and sea-salt flavours.',
      pitch_code: 'A02', trading_dates: openDates },
    { slug: 'pine-and-thread', name: 'Pine & Thread', category: 'Home & decor',
      description: 'Evergreen wreaths, hand-stitched decorations and winter textiles.',
      pitch_code: 'A03', trading_dates: opening },
    { slug: 'west-end-press', name: 'West End Press', category: 'Craft & gifts',
      description: 'Illustrated cards, hand-printed gift wrap and prints inspired by Paisley.',
      pitch_code: 'B01', trading_dates: [...middle, ...closing] },
    { slug: 'gilmour-cocoa', name: 'Gilmour Cocoa', category: 'Food & drink',
      description: 'Hot chocolate by the cup and boxes of handmade truffles.',
      pitch_code: 'B03', trading_dates: [...opening, ...middle] },
  ],
};
