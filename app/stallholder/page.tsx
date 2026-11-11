import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '@/app/sign-in/actions';
import type { Application } from '@/lib/applications';
import { applicationLabel, type Booking } from '@/lib/bookings';
import { first, formatRange, seasonSlug, type SearchParams, type TradingPeriod } from '@/lib/market-data';
import { requireAccount } from '@/lib/supabase/server';
import { ApplicationForm } from './application-form';

export const metadata: Metadata = { title: 'Stallholder area', robots: { index: false } };

const StallholderPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const [{ db, userId, email }, params] = await Promise.all([requireAccount('stallholder'), searchParams]);
  const [profile, applications, periods] = await Promise.all([
    db.from('trader_profiles').select('business_name,category,description,contact_email').eq('user_id', userId).maybeSingle(),
    db.from('applications').select('id,business_name,status,period_slug,bookings(status,pay_by)').eq('trader_id', userId)
      .eq('season_slug', seasonSlug).order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'bookings', ascending: false }).limit(1, { referencedTable: 'bookings' })
      .returns<(Pick<Application, 'id' | 'business_name' | 'status' | 'period_slug'> & {
        bookings: Pick<Booking, 'status' | 'pay_by'>[];
      })[]>(),
    db.from('market_trading_periods').select('slug,starts_on,ends_on,price_pence,accepting_applications')
      .eq('season_slug', seasonSlug).order('starts_on').returns<(TradingPeriod & { accepting_applications: boolean })[]>(),
  ]);
  if (profile.error || applications.error || periods.error) throw new Error('Your stallholder area could not be loaded.');
  const periodsBySlug = new Map(periods.data.map((period) => [period.slug, period]));
  const applied = new Set(applications.data.map((application) => application.period_slug));
  const available = periods.data.filter((period) => period.accepting_applications && !applied.has(period.slug));

  return (
    <div className="container section">
      <div className="page-heading">
        <h1>Stallholder area</h1>
        {first(params.notice) === 'organiser-access' && <p role="alert">Your account needs an organiser membership for this season.</p>}
        <p className="intro">Apply for a stall and check your applications.</p>
        <Link className="text-action" href="/stallholder/profile">Edit business profile</Link>
      </div>
      <div className="two-columns">
        {available.length > 0
          ? <ApplicationForm periods={available} defaults={{
            business_name: profile.data?.business_name ?? '', category: profile.data?.category ?? '',
            description: profile.data?.description ?? '', contact_email: profile.data?.contact_email ?? email, period: '',
          }} />
          : <p className="empty">There are no further weekends open for you to apply for.</p>}
        <section className="panel">
          <h2>Your applications</h2>
          {applications.data.length > 0 ? (
            <div className="list-actions">
              {applications.data.map((application) => {
                const period = periodsBySlug.get(application.period_slug);
                return (
                  <article key={application.id}>
                    <h3><Link href={`/stallholder/applications/${application.id}`}>
                      {period ? formatRange(period.starts_on, period.ends_on) : application.business_name}
                    </Link></h3>
                    <span className="status">{applicationLabel(application.status, application.bookings[0])}</span>
                  </article>
                );
              })}
            </div>
          ) : <p>You haven’t submitted an application yet.</p>}
        </section>
      </div>
      <form className="account-actions" action={signOut}><button className="button button-secondary" type="submit">Sign out</button></form>
    </div>
  );
};

export default StallholderPage;
