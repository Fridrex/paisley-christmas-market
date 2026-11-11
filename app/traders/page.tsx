import type { Metadata } from 'next';
import { ArrowRight, Coffee, Gift, Leaf } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from '@/components/reveal';
import { categories, formatDay, traderFilters, type SearchParams } from '@/lib/market-data';
import { getMarketDays, getTraders } from '@/lib/market';

export const metadata: Metadata = { title: 'Meet the traders' };

const categoryIcons = { 'Craft & gifts': Gift, 'Food & drink': Coffee, 'Home & decor': Leaf };

const TradersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const [days, params] = await Promise.all([getMarketDays(), searchParams]);
  const { q, category, day, suffix } = traderFilters(params, days);
  const traders = await getTraders(day, category);
  const query = q.toLocaleLowerCase('en-GB');
  const results = query ? traders.filter(({ name, description, category, pitch_code }) =>
    `${name} ${description} ${category} ${pitch_code}`.toLocaleLowerCase('en-GB').includes(query)) : traders;

  return (
    <div className="container section">
      <div className="page-heading">
        <h1>Meet the traders</h1>
        <p className="intro">Find local makers and see when they’re trading.</p>
      </div>
      <form action="/traders" className="filter-form trader-filter" key={suffix}>
        <label>Search traders<input name="q" type="search" defaultValue={q} maxLength={100} placeholder="Try ceramics or fudge" /></label>
        <label>Category<select name="category" defaultValue={category}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select></label>
        <label>Trading day<select name="day" defaultValue={day}>
          <option value="">All days</option>
          {days.filter(({ opens_at }) => opens_at).map(({ date }) => (
            <option value={date} key={date}>{formatDay(date, true)}</option>
          ))}
        </select></label>
        <button type="submit" className="button">Filter traders</button>
      </form>
      <div className="results-line">
        <p role="status">{results.length} {results.length === 1 ? 'trader' : 'traders'}</p>
        {suffix && <Link href="/traders">Clear filters</Link>}
      </div>
      <Reveal key={`results${suffix}`}>{results.length > 0 ? (
        <ul className="trader-grid">
          {results.map((trader) => {
            const Icon = categoryIcons[trader.category];
            return (
              <li key={trader.slug} className="trader-card">
                <div className="category-art" data-category={trader.category}>
                  <Icon size={40} strokeWidth={1.2} aria-hidden="true" />
                  <span>{trader.category}</span>
                </div>
                <div className="trader-copy">
                  <h2><Link href={`/traders/${trader.slug}${suffix}`}>{trader.name}</Link></h2>
                  <p>{trader.description}</p>
                  <span className="pitch-label">Stall {trader.pitch_code} <ArrowRight size={16} aria-hidden="true" /></span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="empty">No traders match these filters. Try a different day, category or search.</p>}</Reveal>
    </div>
  );
};

export default TradersPage;
