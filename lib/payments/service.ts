import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { attemptColumns, bookingColumns, checkoutMinimumMs, deadlinePassed, type Booking, type PaymentAttempt, type PreparedCheckout } from '@/lib/bookings';
import { supabaseConfig } from '@/lib/supabase/config';
import { checkoutParams, stripeClient, stripeResult } from './stripe';

export const paymentsConfigured = () => {
  return Boolean(supabaseConfig() && process.env.SUPABASE_SECRET_KEY && process.env.STRIPE_SECRET_KEY
    && process.env.STRIPE_WEBHOOK_SECRET && process.env.APP_URL);
};

export const paymentServices = () => {
  const config = supabaseConfig();
  const dbKey = process.env.SUPABASE_SECRET_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const appUrl = process.env.APP_URL;
  if (!config || !dbKey || !stripeKey || !webhookSecret || !appUrl) {
    throw new Error('Configure the market payment services.');
  }
  return {
    db: createClient(config.url, dbKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    }),
    stripe: stripeClient(stripeKey),
    origin: new URL(appUrl).origin,
    webhookSecret,
  };
};

type Services = ReturnType<typeof paymentServices>;

export const recordSession = async (services: Services, session: Stripe.Checkout.Session, event?: Stripe.Event) => {
  const result = stripeResult(session, event?.type === 'checkout.session.async_payment_failed');
  if (!result) return;
  const { error } = await services.db.rpc('record_checkout', { ...result, p_event: event?.id ?? null });
  if (error) throw new Error(`Could not record Checkout (${error.code}).`);
};

const findSession = async (stripe: Stripe, booking: Booking, attempt: PaymentAttempt) => {
  if (attempt.stripe_session_id) return stripe.checkout.sessions.retrieve(attempt.stripe_session_id);

  // Stripe may have created a session before the app lost its response.
  const gte = Math.floor(Date.parse(attempt.created_at) / 1000) - 300;
  const lte = Math.floor(Date.parse(booking.pay_by) / 1000);
  for await (const session of stripe.checkout.sessions.list({ created: { gte, lte }, limit: 100 })) {
    if (session.metadata?.paisley_attempt === attempt.id && session.metadata.paisley_booking === booking.id) {
      return session;
    }
  }
  return null;
};

export const openCheckout = async (services: Services, { booking, attempt }: PreparedCheckout) => {
  const { stripe, origin } = services;
  const remaining = Date.parse(booking.pay_by) - Date.now();
  if (remaining <= 0) return { status: 'unavailable' } as const;
  const session = attempt.stripe_session_id || remaining <= checkoutMinimumMs
    ? await findSession(stripe, booking, attempt)
    : await stripe.checkout.sessions.create(checkoutParams(booking, attempt, origin), { idempotencyKey: attempt.id });
  if (!session) return { status: 'unavailable' } as const;
  await recordSession(services, session);
  if (session.status === 'open' && session.url) return { status: 'ready', url: session.url } as const;
  if (session.status === 'expired') return { status: 'retry' } as const;
  return { status: 'returned' } as const;
};

export const reconcileBooking = async (services: Services, booking: Booking) => {
  const { db, stripe } = services;
  if (booking.status !== 'held') return;
  const { data: attempt, error } = await db.from('payment_attempts').select(attemptColumns)
    .eq('booking_id', booking.id).eq('status', 'open').maybeSingle<PaymentAttempt>();
  if (error) throw new Error(`Could not read the payment attempt (${error.code}).`);
  const overdue = deadlinePassed(booking);

  let missingAttempt: string | null = null;
  if (attempt) {
    let session = await findSession(stripe, booking, attempt);
    if (session?.status === 'open' && overdue) {
      try {
        session = await stripe.checkout.sessions.expire(session.id);
      } catch {
        // Checkout may have completed while the expiration request was in flight.
        session = await stripe.checkout.sessions.retrieve(session.id);
        if (session.status === 'open') throw new Error('Checkout is still open.');
      }
    }
    if (session?.status === 'complete' && session.payment_status === 'unpaid') {
      session = await stripe.checkout.sessions.retrieve(session.id, { expand: ['payment_intent'] });
    }
    if (session) {
      await recordSession(services, session);
    } else if (overdue) {
      missingAttempt = attempt.id;
    }
  }
  if (overdue) {
    const { error: releaseError } = await db.rpc('expire_booking', {
      p_booking: booking.id, p_missing_attempt: missingAttempt,
    });
    if (releaseError) throw new Error(`Could not release the booking (${releaseError.code}).`);
  }
};

export const reconcileOverdue = async (services: Services) => {
  const { data, error } = await services.db.from('bookings').select(bookingColumns)
    .eq('status', 'held').lte('pay_by', new Date().toISOString()).order('pay_by').limit(30).returns<Booking[]>();
  if (error) throw new Error(`Could not read overdue bookings (${error.code}).`);
  const results = await Promise.allSettled(data.map((booking) => reconcileBooking(services, booking)));
  const failed = results.filter((result, index) => {
    if (result.status === 'fulfilled') return false;
    console.error('Booking reconciliation failed', { booking: data[index].id });
    return true;
  }).length;
  return { checked: data.length, failed };
};
