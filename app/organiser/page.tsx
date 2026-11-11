import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '@/app/sign-in/actions';
import type { Application } from '@/lib/applications';
import { applicationLabel, applicationStage, applicationStageLabels, type Booking } from '@/lib/bookings';
import { getPeriods } from '@/lib/market';
import { first, formatRange, seasonSlug, type SearchParams } from '@/lib/market-data';
import { requireOrganiser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Organiser area', robots: { index: false } };

const OrganiserPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const [{ db }, params] = await Promise.all([requireOrganiser(), searchParams]);
  const periods = await getPeriods();
  const periodsBySlug = new Map(periods.map((period) => [period.slug, period]));
  const statuses = Object.keys(applicationStageLabels) as (keyof typeof applicationStageLabels)[];
  const status = statuses.find((item) => item === first(params.status)) ?? '';
  const period = periodsBySlug.get(first(params.period) ?? '')?.slug ?? '';
  let query = db.from('applications').select('id,business_name,category,period_slug,status,bookings(status,pay_by)')
    .eq('season_slug', seasonSlug);
  if (period) query = query.eq('period_slug', period);
  const { data, error } = await query.order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'bookings', ascending: false }).limit(1, { referencedTable: 'bookings' })
    .returns<(Pick<Application, 'id' | 'business_name' | 'category' | 'period_slug' | 'status'> & {
      bookings: Pick<Booking, 'status' | 'pay_by'>[];
    })[]>();
  if (error) throw new Error('The application queue could not be loaded.');
  const applications = status ? data.filter((application) => applicationStage(application.status, application.bookings[0]) === status) : data;

  return (
    <div className="container section">
      <div className="page-heading">
        <h1>Organiser area</h1>
        <p className="intro">Review applications for the Paisley demo season.</p>
        <nav aria-label="Organiser tools">
          <Link href="/organiser/programme">Manage programme</Link>
          <Link href="/organiser/stalls">Manage stall publication</Link>
        </nav>
      </div>
      <form action="/organiser" className="filter-form trader-filter" key={`${period}-${status}`}>
        <label>Trading weekend<select name="period" defaultValue={period}>
          <option value="">All weekends</option>
          {periods.map((item) => <option key={item.slug} value={item.slug}>{formatRange(item.starts_on, item.ends_on)}</option>)}
        </select></label>
        <label>Status<select name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{applicationStageLabels[item]}</option>)}
        </select></label>
        <button className="button" type="submit">Filter applications</button>
      </form>
      <section className="panel" aria-labelledby="queue-heading">
        <h2 id="queue-heading">Applications</h2>
        <p role="status">{applications.length} {applications.length === 1 ? 'application' : 'applications'}</p>
        {applications.length > 0 ? <div className="list-actions">
          {applications.map((application) => {
            const period = periodsBySlug.get(application.period_slug);
            return (
              <article key={application.id}>
                <h3><Link href={`/organiser/applications/${application.id}`}>{application.business_name}</Link></h3>
                <p>{application.category}{period && ` · ${formatRange(period.starts_on, period.ends_on)}`}</p>
                <span className="status">{applicationLabel(application.status, application.bookings[0])}</span>
              </article>
            );
          })}
        </div> : <p>No applications match these filters.</p>}
      </section>
      <form className="account-actions" action={signOut}><button className="button button-secondary" type="submit">Sign out</button></form>
    </div>
  );
};

export default OrganiserPage;
