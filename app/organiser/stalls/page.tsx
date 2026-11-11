import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDay, seasonSlug, type Trader } from '@/lib/market-data';
import { requireOrganiser } from '@/lib/supabase/server';
import { PublicationForm } from './publication-form';

export const metadata: Metadata = { title: 'Manage stall publication', robots: { index: false } };

const ManageStalls = async () => {
  const { db } = await requireOrganiser();
  const { data, error } = await db.from('trader_listings').select('slug,name,pitch_code,trading_dates,published')
    .eq('season_slug', seasonSlug).order('pitch_code').order('name')
    .returns<(Pick<Trader, 'slug' | 'name' | 'pitch_code' | 'trading_dates'> & { published: boolean })[]>();
  if (error) throw new Error('The stall listings could not be loaded.');
  return (
    <div className="container section">
      <Link className="text-action back-link" href="/organiser">Back to organiser area</Link>
      <div className="page-heading">
        <h1>Manage stall publication</h1>
        <p>Published stalls appear in the trader catalogue and on the map for their trading days.</p>
      </div>
      {data.length > 0 ? (
        <div className="list-actions">
          {data.map((trader) => (
            <article key={trader.slug}>
              <h2 className="small-heading">{trader.name}</h2>
              <p>Stall {trader.pitch_code} · {trader.trading_dates.map((date) => formatDay(date)).join(', ')}</p>
              <span className="status">{trader.published ? 'Published' : 'Hidden'}</span>
              <PublicationForm slug={trader.slug} name={trader.name} published={trader.published} />
            </article>
          ))}
        </div>
      ) : <p>There are no stall listings yet.</p>}
    </div>
  );
};

export default ManageStalls;
