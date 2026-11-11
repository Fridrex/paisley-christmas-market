import Stripe from 'stripe';
import type { Booking, PaymentAttempt } from '@/lib/bookings';

export const stripeClient = (secret: string) => {
  if (!/^(sk|rk)_test_/.test(secret)) throw new Error('The demo requires a Stripe test key.');
  return new Stripe(secret, { timeout: 8_000, maxNetworkRetries: 1 });
};

export const checkoutParams = (booking: Booking, attempt: PaymentAttempt, appOrigin: string): Stripe.Checkout.SessionCreateParams => {
  const returnUrl = new URL(`/stallholder/applications/${booking.application_id}`, appOrigin);
  return {
    mode: 'payment',
    locale: 'en-GB',
    allowed_payment_method_types: ['card'],
    adaptive_pricing: { enabled: false },
    expires_at: Math.floor(Date.parse(booking.pay_by) / 1000),
    client_reference_id: booking.id,
    metadata: { paisley_booking: booking.id, paisley_attempt: attempt.id },
    success_url: `${returnUrl}?checkout=returned`,
    cancel_url: `${returnUrl}?checkout=cancelled`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: booking.price_pence,
        product_data: { name: `Paisley Christmas Market · Stall ${booking.pitch_code}`, description: 'Demo season · test payment' },
      },
    }],
  };
};

export const stripeResult = (session: Stripe.Checkout.Session, failed = false) => {
  const booking = session.metadata?.paisley_booking;
  const attempt = session.metadata?.paisley_attempt;
  if (!booking && !attempt) return null;
  if (!booking || !attempt || session.client_reference_id !== booking || session.livemode
    || session.mode !== 'payment' || session.currency !== 'gbp' || !Number.isInteger(session.amount_total)
    || !session.id.startsWith('cs_test_')) {
    throw new Error('Stripe session does not match a test market checkout.');
  }
  const intent = session.payment_intent;
  const cancelled = typeof intent === 'object' && intent?.status === 'canceled';
  let status: 'open' | 'paid' | 'expired' = session.status === 'expired' ? 'expired' : 'open';
  if (session.status === 'complete') {
    if (session.payment_status === 'paid') status = 'paid';
    if (session.payment_status === 'unpaid' && (failed || cancelled)) status = 'expired';
  }
  return {
    p_booking: booking, p_attempt: attempt, p_session: session.id,
    p_amount: session.amount_total, p_currency: session.currency, p_status: status,
  };
};
