import type { Metadata } from 'next';
import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDay, traderFilters, type SearchParams } from '@/lib/market-data';
import { getMarketDays, getPitches, getTrader } from '@/lib/market';

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params;
  const trader = await getTrader(slug);
  return { title: trader?.name ?? 'Trader unavailable' };
};

const TraderPage = async ({ params, searchParams }: Props) => {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const [trader, days, pitches] = await Promise.all([getTrader(slug), getMarketDays(), getPitches()]);
  if (!trader) notFound();
  const { suffix, day } = traderFilters(filters, days);
  const pitch = pitches.find((item) => item.code === trader.pitch_code);
  const mapDay = trader.trading_dates.includes(day) ? day : trader.trading_dates[0];

  return (
    <div className="container section">
      <Link className="text-action back-link" href={`/traders${suffix}`}><ArrowLeft size={17} aria-hidden="true" /> Back to traders</Link>
      <div className="page-heading">
        <p className="eyebrow">{trader.category}</p>
        <h1>{trader.name}</h1>
        <p className="intro">{trader.description}</p>
      </div>
      <section className="panel detail-panel">
        <h2>Where to find us</h2>
        <p>Stall <strong>{trader.pitch_code}</strong>{pitch && ` · ${pitch.zone}`}</p>
        <h3>Trading dates</h3>
        <ul className="date-list">
          {trader.trading_dates.map((date) => <li key={date}><time dateTime={date}>{formatDay(date, true)}</time></li>)}
        </ul>
        <Link className="button" href={`/plan-your-visit?stall=${trader.pitch_code}&day=${mapDay}#stalls`}>
          <MapPin size={18} aria-hidden="true" /> Find on the map
        </Link>
      </section>
    </div>
  );
};

export default TraderPage;
