import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { connection } from 'next/server';
import { cache } from 'react';
import { demoMarket } from './demo-market';
import { type Category, type MarketDay, type Pitch, type ProgrammeItem, type Season, type Trader, type TradingPeriod, seasonSlug } from './market-data';
import { supabaseConfig } from './supabase/config';

const traderColumns = 'slug,name,category,description,pitch_code,trading_dates';

const publicDb = cache(async () => {
  const config = supabaseConfig();
  if (!config) return null;
  await connection();
  return createClient(config.url, config.key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
});

const read = async <T>(query: PromiseLike<{ data: T; error: null } | { data: null; error: { message: string } }>) => {
  const { data, error } = await query;
  if (error) throw new Error('The public market data could not be loaded.');
  return data;
};

export const getSeason = cache(async () => {
  const db = await publicDb();
  return db ? read(db.from('seasons').select('slug,name,location,starts_on,ends_on,is_demo')
    .eq('slug', seasonSlug).single<Season>()) : demoMarket.season;
});

export const getMarketDays = cache(async () => {
  const db = await publicDb();
  return db ? read(db.from('market_days').select('date,opens_at,closes_at')
    .eq('season_slug', seasonSlug).order('date').returns<MarketDay[]>()) : demoMarket.days;
});

export const getPeriods = cache(async () => {
  const db = await publicDb();
  return db ? read(db.from('trading_periods').select('slug,starts_on,ends_on,price_pence')
    .eq('season_slug', seasonSlug).order('starts_on').returns<TradingPeriod[]>()) : demoMarket.periods;
});

export const getProgramme = cache(async (date: string) => {
  const db = await publicDb();
  return db ? read(db.from('programme_items').select('id,date,starts_at,previous_start,title,zone,status')
    .eq('season_slug', seasonSlug).eq('date', date).order('starts_at').returns<ProgrammeItem[]>())
    : demoMarket.programme.filter((item) => item.date === date);
});

export const getPitches = cache(async () => {
  const db = await publicDb();
  return db ? read(db.from('pitches').select('code,zone,position')
    .eq('season_slug', seasonSlug).order('position').returns<Pitch[]>()) : demoMarket.pitches;
});

export const getTraders = cache(async (day = '', category: Category | '' = '') => {
  const db = await publicDb();
  if (!db) return demoMarket.traders.filter((trader) =>
    (!day || trader.trading_dates.includes(day)) && (!category || trader.category === category));

  let query = db.from('trader_listings').select(traderColumns).eq('season_slug', seasonSlug);
  if (day) query = query.contains('trading_dates', [day]);
  if (category) query = query.eq('category', category);
  return read(query.order('pitch_code').order('name').returns<Trader[]>());
});

export const getTrader = cache(async (slug: string): Promise<Trader | null> => {
  const db = await publicDb();
  return db ? read(db.from('trader_listings').select(traderColumns)
    .eq('season_slug', seasonSlug).eq('slug', slug).maybeSingle<Trader>())
    : demoMarket.traders.find((trader) => trader.slug === slug) ?? null;
});
