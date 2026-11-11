import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatPrice, formatRange } from '@/lib/market-data';
import { getPeriods } from '@/lib/market';

export const metadata: Metadata = { title: 'Trade with us' };

const TradePage = async () => {
  const periods = await getPeriods();
  return (
    <div className="container section">
      <div className="page-heading">
        <h1>Trade with us</h1>
        <p className="intro">Apply for a weekend stall at Paisley Christmas Market.</p>
      </div>
      <div className="two-columns">
        <section className="panel">
          <h2>Trading weekends</h2>
          <p>Sample prices for a standard stall covering all three trading days.</p>
          <ul className="price-list">
            {periods.map((period) => (
              <li key={period.slug}>
                <span>{formatRange(period.starts_on, period.ends_on)}</span>
                <strong>{formatPrice(period.price_pence)}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>How to apply</h2>
          <ol className="steps">
            <li>Sign in and tell us what you sell.</li>
            <li>Choose a weekend and review your application.</li>
            <li>Check your stallholder area for the organiser’s decision.</li>
          </ol>
          <p>Applications are for the demo season.</p>
          <Link className="button" href="/stallholder">Go to stallholder area <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </div>
    </div>
  );
};

export default TradePage;
