import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isUuid } from '@/lib/bookings';
import { getMarketDays } from '@/lib/market';
import { seasonSlug, type ProgrammeItem } from '@/lib/market-data';
import { requireOrganiser } from '@/lib/supabase/server';
import { EventForm } from '../event-form';

export const metadata: Metadata = { title: 'Edit programme event', robots: { index: false } };

const EditProgrammeEvent = async ({ params }: { params: Promise<{ id: string }> }) => {
  const [{ id }, { db }] = await Promise.all([params, requireOrganiser()]);
  if (id !== 'new' && !isUuid(id)) notFound();
  let event: (ProgrammeItem & { published: boolean }) | undefined;
  if (id !== 'new') {
    const { data, error } = await db.from('programme_items').select('id,date,starts_at,previous_start,title,zone,status,published')
      .eq('season_slug', seasonSlug).eq('id', id).maybeSingle<ProgrammeItem & { published: boolean }>();
    if (error) throw new Error('The event could not be loaded.');
    if (!data) notFound();
    event = data;
  }
  const days = await getMarketDays();
  return (
    <div className="container section">
      <Link className="text-action back-link" href="/organiser/programme">Back to programme</Link>
      <div className="page-heading"><h1>{event ? 'Edit event' : 'Add event'}</h1></div>
      <EventForm event={event} days={days} />
    </div>
  );
};

export default EditProgrammeEvent;
