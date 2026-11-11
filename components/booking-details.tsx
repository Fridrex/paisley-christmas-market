import { bookingLabel, formatDeadline, type BookingWithDates } from '@/lib/bookings';
import { formatDay, formatPrice } from '@/lib/market-data';
import { Reveal } from './reveal';

export const BookingDetails = ({ booking, children }: { booking: BookingWithDates; children?: React.ReactNode }) => {
  const dates = booking.booking_days.map(({ date }) => date).sort();
  return (
    <section className="panel" aria-labelledby="booking-heading">
      <Reveal key={booking.status}><p className="status">{bookingLabel(booking)}</p></Reveal>
      <h2 id="booking-heading">{booking.status === 'confirmed' ? 'Your booking' : 'Stall offer'}</h2>
      <dl className="review-list">
        <div><dt>Stall</dt><dd>{booking.pitch_code}</dd></div>
        <div><dt>Dates</dt><dd>{dates.map((date) => formatDay(date, true)).join(', ')}</dd></div>
        <div><dt>Stall hire</dt><dd>{formatPrice(booking.price_pence)}</dd></div>
        {booking.status !== 'confirmed' && (
          <div><dt>Payment deadline</dt><dd><time dateTime={booking.pay_by}>{formatDeadline(booking.pay_by)}</time></dd></div>
        )}
      </dl>
      {children}
    </section>
  );
};
