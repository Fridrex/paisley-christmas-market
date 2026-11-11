import type { ApplicationStatus } from './applications';
import { applicationStatuses } from './applications';

export type Booking = {
  id: string;
  application_id: string;
  season_slug: string;
  pitch_code: string;
  price_pence: number;
  status: 'held' | 'confirmed' | 'expired';
  pay_by: string;
  created_at: string;
};

export type PaymentAttempt = {
  id: string;
  booking_id: string;
  stripe_session_id: string | null;
  status: 'open' | 'paid' | 'expired' | 'no_session';
  created_at: string;
};

export type BookingWithDates = Booking & { booking_days: { date: string }[] };
export type PreparedCheckout = { booking: Booking; attempt: PaymentAttempt };
export const bookingColumns = 'id,application_id,season_slug,pitch_code,price_pence,status,pay_by,created_at';
export const attemptColumns = 'id,booking_id,stripe_session_id,status,created_at';
export const checkoutMinimumMs = 31 * 60 * 1000;
export const paymentLabels = {
  open: 'Open or awaiting reconciliation',
  paid: 'Paid',
  expired: 'Closed without payment',
  no_session: 'No session found',
};
export const bookingStatuses = {
  awaiting_payment: 'Awaiting payment',
  checking_payment: 'Checking payment',
  confirmed: 'Confirmed',
  expired: 'Offer expired',
};

export const deadlinePassed = (booking: Pick<Booking, 'pay_by'>, now = Date.now()) =>
  Date.parse(booking.pay_by) <= now;

const bookingStage = (booking: Pick<Booking, 'status' | 'pay_by'>) => {
  if (booking.status !== 'held') return booking.status;
  return deadlinePassed(booking) ? 'checking_payment' : 'awaiting_payment';
};

export const bookingLabel = (booking: Pick<Booking, 'status' | 'pay_by'>) => bookingStatuses[bookingStage(booking)];

export const applicationStageLabels = { ...applicationStatuses, ...bookingStatuses };

export const applicationStage = (status: ApplicationStatus, booking?: Pick<Booking, 'status' | 'pay_by'> | null) =>
  booking && status !== 'declined' ? bookingStage(booking) : status;

export const applicationLabel = (status: ApplicationStatus, booking?: Pick<Booking, 'status' | 'pay_by'> | null) =>
  applicationStageLabels[applicationStage(status, booking)];

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  hourCycle: 'h23', timeZone: 'Europe/London', timeZoneName: 'short',
});

export const formatDeadline = (value: string) => dateTime.format(new Date(value));

export const isUuid = (value: string) => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
