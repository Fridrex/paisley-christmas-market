export const categories = ['Craft & gifts', 'Food & drink', 'Home & decor'] as const;
export type Category = (typeof categories)[number];

export type Season = {
  slug: string;
  name: string;
  location: string;
  starts_on: string;
  ends_on: string;
  is_demo: boolean;
};

export type MarketDay = { date: string; opens_at: string | null; closes_at: string | null };
export type TradingPeriod = { slug: string; starts_on: string; ends_on: string; price_pence: number };
export type ProgrammeItem = {
  id: string;
  date: string;
  starts_at: string;
  previous_start: string | null;
  title: string;
  zone: string;
  status: 'scheduled' | 'changed' | 'cancelled';
};
export type Pitch = { code: string; zone: string; position: number };
export type Trader = {
  slug: string;
  name: string;
  category: Category;
  description: string;
  pitch_code: string;
  trading_dates: string[];
};
export type Market = {
  season: Season;
  days: MarketDay[];
  periods: TradingPeriod[];
  programme: ProgrammeItem[];
  pitches: Pitch[];
  traders: Trader[];
};

export const seasonSlug = 'paisley-2026';
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', timeZone: 'Europe/London',
});
const weekdayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London',
});
const monthFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', timeZone: 'Europe/London',
});
const moneyFormat = new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export const formatDay = (date: string, weekday = false) =>
  (weekday ? weekdayFormat : dateFormat).format(new Date(date));

export const formatRange = (start: string, end: string) => {
  const lastDay = monthFormat.format(new Date(end));
  if (start === end) return lastDay;
  const firstDay = start.slice(0, 7) === end.slice(0, 7)
    ? Number(start.slice(8, 10))
    : monthFormat.format(new Date(start));
  return `${firstDay}–${lastDay}`;
};

export const formatTime = (time: string) => time.slice(0, 5);

export const formatPrice = (pence: number) => moneyFormat.format(pence / 100);

export const traderFilters = (params: Awaited<SearchParams>, days: MarketDay[]) => {
  const q = first(params.q)?.trim().slice(0, 100) ?? '';
  const requestedCategory = first(params.category);
  const category = categories.find((value) => value === requestedCategory) ?? ('' as const);
  const requestedDay = first(params.day);
  const day = days.find((date) => date.opens_at && date.date === requestedDay)?.date ?? '';
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (category) query.set('category', category);
  if (day) query.set('day', day);
  return { q, category, day, suffix: query.size ? `?${query}` : '' };
};
