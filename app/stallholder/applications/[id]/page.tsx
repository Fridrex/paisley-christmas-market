import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApplicationDetails } from '@/components/application-details';
import { BookingDetails } from '@/components/booking-details';
import { applicationColumns, type Application } from '@/lib/applications';
import { bookingColumns, deadlinePassed, isUuid, type BookingWithDates } from '@/lib/bookings';
import { getPeriods } from '@/lib/market';
import { first, formatPrice, seasonSlug, type SearchParams } from '@/lib/market-data';
import { paymentsConfigured } from '@/lib/payments/service';
import { requireAccount } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Your stall application', robots: { index: false } };

const checkoutMessages = {
  cancelled: 'You left Checkout. You can return before the offer expires.',
  returned: 'We’re checking your payment. Refresh this page to see the latest status.',
  unavailable: 'Checkout is unavailable for this offer. A new session needs at least 31 minutes before the deadline.',
  retry: 'The previous Checkout session closed. Try opening Checkout again.',
  error: 'We couldn’t open Checkout. Try again in a moment.',
} as const;

const StallholderApplicationPage = async ({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: SearchParams;
}) => {
  const [{ id }, { db, userId }, search] = await Promise.all([params, requireAccount('stallholder'), searchParams]);
  if (!isUuid(id)) notFound();
  const { data, error } = await db.from('applications').select(applicationColumns).eq('id', id)
    .eq('season_slug', seasonSlug).eq('trader_id', userId).maybeSingle<Application>();
  if (error) throw new Error('Your application could not be loaded.');
  if (!data) notFound();
  const [periods, bookingResult] = await Promise.all([
    getPeriods(),
    db.from('bookings').select(`${bookingColumns},booking_days(date)`).eq('application_id', id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle<BookingWithDates>(),
  ]);
  if (bookingResult.error) throw new Error('The stall offer could not be loaded.');
  const booking = bookingResult.data;
  const overdue = booking && deadlinePassed(booking);
  const checkout = first(search.checkout);
  const message = checkout && Object.hasOwn(checkoutMessages, checkout)
    ? checkoutMessages[checkout as keyof typeof checkoutMessages] : null;

  return (
    <div className="container section">
      <Link className="text-action back-link" href="/stallholder">Back to your applications</Link>
      <h1>{data.business_name}</h1>
      <div className="two-columns">
        <ApplicationDetails application={data} period={periods.find((item) => item.slug === data.period_slug)} />
        {booking && (
          <BookingDetails booking={booking}>
            {booking.status === 'confirmed' ? (
              <p className="booking-copy">Your test payment has been confirmed. Your stall is reserved for the dates shown.</p>
            ) : (
              <>
                {message && <p role="status" className="booking-copy">{message}</p>}
                {booking.status === 'held' && !overdue && (
                  <>
                    <p className="booking-copy">Stripe takes a test payment to confirm this stall. Unpaid offers expire at the deadline. For a cancellation after confirmation, contact the organiser.</p>
                    {paymentsConfigured() ? (
                      <form action={`/stallholder/applications/${id}/checkout`} method="post">
                        <input type="hidden" name="booking" value={booking.id} />
                        <button className="button" type="submit">Pay {formatPrice(booking.price_pence)} to confirm</button>
                      </form>
                    ) : <p>Test payments are unavailable until Stripe is connected.</p>}
                  </>
                )}
                {booking.status === 'held' && (checkout === 'returned' || overdue) && (
                  <Link className="text-action" href={`/stallholder/applications/${id}`}>Refresh booking status</Link>
                )}
              </>
            )}
          </BookingDetails>
        )}
      </div>
    </div>
  );
};

export default StallholderApplicationPage;
