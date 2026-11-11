import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDay, formatTime, first, seasonSlug, type ProgrammeItem, type SearchParams } from '@/lib/market-data';
import { requireOrganiser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Manage programme', robots: { index: false } };

const ManageProgramme = async ({ searchParams }: { searchParams: SearchParams }) => {
  const [{ db }, params] = await Promise.all([requireOrganiser(), searchParams]);
  const { data, error } = await db.from('programme_items').select('id,date,starts_at,previous_start,title,zone,status,published')
    .eq('season_slug', seasonSlug).order('date').order('starts_at').returns<(ProgrammeItem & { published: boolean })[]>();
  if (error) throw new Error('The organiser programme could not be loaded.');
  return (
    <div className="container section">
      <Link className="text-action back-link" href="/organiser">Back to organiser area</Link>
      <div className="page-heading"><h1>Manage programme</h1></div>
      {first(params.saved) === '1' && <p role="status">Event saved.</p>}
      <Link className="button" href="/organiser/programme/new">Add event</Link>
      {data.length > 0 ? (
        <div className="list-actions">
          {data.map((event) => (
            <article key={event.id}>
              <h2 className="small-heading"><Link href={`/organiser/programme/${event.id}`}>{event.title}</Link></h2>
              <p>{formatDay(event.date, true)} · {formatTime(event.starts_at)} · {event.zone}</p>
              <span className="status">{event.published ? 'Published' : 'Draft'}</span>
              {event.status === 'cancelled' && <span className="status adjacent-status">Cancelled</span>}
              {event.status === 'changed' && <span className="status adjacent-status">Time changed</span>}
            </article>
          ))}
        </div>
      ) : <p className="booking-copy">There are no programme items yet.</p>}
    </div>
  );
};

export default ManageProgramme;
