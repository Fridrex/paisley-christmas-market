import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApplicationDetails } from '@/components/application-details';
import { BookingDetails } from '@/components/booking-details';
import { applicationColumns, type Application } from '@/lib/applications';
import { attemptColumns, bookingColumns, formatDeadline, isUuid, paymentLabels, type BookingWithDates, type PaymentAttempt } from '@/lib/bookings';
import { getPeriods } from '@/lib/market';
import { formatPrice, seasonSlug } from '@/lib/market-data';
import { requireOrganiser } from '@/lib/supabase/server';
import { CheckPaymentForm, OfferForm } from './booking-forms';
import { DecisionForm } from './decision-form';

export const metadata: Metadata = { title: 'Review stall application', robots: { index: false } };

const OrganiserApplicationPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const [{ id }, { db }] = await Promise.all([params, requireOrganiser()]);
  if (!isUuid(id)) notFound();
  const { data, error } = await db.from('applications').select(applicationColumns)
    .eq('id', id).eq('season_slug', seasonSlug).maybeSingle<Application>();
  if (error) throw new Error('The application could not be loaded.');
  if (!data) notFound();
  const [periods, pitches, bookingResult] = await Promise.all([
    getPeriods(),
    db.rpc('available_pitches', { p_application: id }),
    db.from('bookings').select(`${bookingColumns},booking_days(date),payment_attempts(${attemptColumns})`)
      .eq('application_id', id).order('created_at', { ascending: false })
      .returns<(BookingWithDates & { payment_attempts: PaymentAttempt[] })[]>(),
  ]);
  if (pitches.error || bookingResult.error) throw new Error('Stall availability or payments could not be loaded.');
  const availablePitches = pitches.data as { code: string; zone: string }[];
  const booking = bookingResult.data[0];
  const period = periods.find((item) => item.slug === data.period_slug);
  const canOffer = data.status !== 'declined' && (!booking || booking.status === 'expired');
  const payments = bookingResult.data.flatMap((entry) => entry.payment_attempts)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="container section">
      <Link className="text-action back-link" href="/organiser">Back to applications</Link>
      <h1>{data.business_name}</h1>
      <div className="two-columns">
        <ApplicationDetails application={data} period={period} />
        {booking && (
          <BookingDetails booking={booking}>
            {booking.status === 'held' && <CheckPaymentForm id={id} bookingId={booking.id} />}
            {booking.status === 'confirmed' && <Link className="text-action" href="/organiser/stalls">Manage stall publication</Link>}
          </BookingDetails>
        )}
        {canOffer && period && <OfferForm id={id} pitches={availablePitches} price={formatPrice(period.price_pence)} />}
        {(canOffer || data.status === 'declined') && <DecisionForm id={data.id} current={data.status} />}
        {booking && (
          <section className="panel">
            <h2>Payment history</h2>
            {payments.length ? (
              <ul className="price-list" role="list">
                {payments.map((attempt) => <li key={attempt.id}>
                  <span>{paymentLabels[attempt.status]}</span>
                  <time dateTime={attempt.created_at}>{formatDeadline(attempt.created_at)}</time>
                </li>)}
              </ul>
            ) : <p>There have been no Checkout attempts.</p>}
          </section>
        )}
      </div>
    </div>
  );
};

export default OrganiserApplicationPage;
