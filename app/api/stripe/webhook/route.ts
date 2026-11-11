import type Stripe from 'stripe';
import { paymentServices, paymentsConfigured, recordSession } from '@/lib/payments/service';

const events = new Set([
  'checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed', 'checkout.session.expired',
]);

export const POST = async (request: Request) => {
  if (!paymentsConfigured()) return new Response(null, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response(null, { status: 400 });
  const services = paymentServices();
  let event: Stripe.Event;
  try {
    event = services.stripe.webhooks.constructEvent(await request.text(), signature, services.webhookSecret);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!events.has(event.type) || event.livemode) return new Response(null, { status: 204 });

  const snapshot = event.data.object as Stripe.Checkout.Session;
  if (!snapshot.metadata?.paisley_booking && !snapshot.metadata?.paisley_attempt) {
    return new Response(null, { status: 204 });
  }
  try {
    const session = await services.stripe.checkout.sessions.retrieve(snapshot.id);
    await recordSession(services, session, event);
    return new Response(null, { status: 204 });
  } catch {
    console.error('Checkout webhook could not be processed', { event: event.id, type: event.type });
    return new Response(null, { status: 500 });
  }
};
