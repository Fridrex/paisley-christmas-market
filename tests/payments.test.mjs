import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkoutParams, stripeClient, stripeResult } from '../lib/payments/stripe.ts';

const booking = {
  id: '00000000-0000-4000-8000-000000000001',
  application_id: '00000000-0000-4000-8000-000000000002',
  pitch_code: 'B02',
  price_pence: 12000,
  pay_by: '2026-12-01T10:00:00Z',
};
const attempt = { id: '00000000-0000-4000-8000-000000000003' };
const session = {
  id: 'cs_test_example',
  mode: 'payment',
  livemode: false,
  client_reference_id: booking.id,
  metadata: { paisley_booking: booking.id, paisley_attempt: attempt.id },
  currency: 'gbp',
  amount_total: 12000,
  payment_status: 'paid',
  status: 'complete',
};

test('Checkout uses the saved price, deadline and application return path', () => {
  const params = checkoutParams(booking, attempt, 'https://demo.example.test');
  assert.equal(params.expires_at, Date.parse(booking.pay_by) / 1000);
  assert.equal(params.line_items[0].price_data.unit_amount, 12000);
  assert.equal(params.line_items[0].price_data.currency, 'gbp');
  assert.deepEqual(params.allowed_payment_method_types, ['card']);
  assert.deepEqual(params.metadata, session.metadata);
  assert.equal(params.success_url, `https://demo.example.test/stallholder/applications/${booking.application_id}?checkout=returned`);
});

test('the Stripe SDK verifies the original event body and rejects a modified body', () => {
  const stripe = stripeClient('sk_test_fixture');
  const secret = 'local-webhook-signing-fixture';
  const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: session } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const event = stripe.webhooks.constructEvent(payload, signature, secret);
  assert.equal(stripeResult(event.data.object).p_status, 'paid');
  assert.throws(() => stripe.webhooks.constructEvent(payload.replace('12000', '1'), signature, secret));
  assert.throws(() => stripeClient('sk_live_fixture'));
});

test('only settled GBP test payments confirm and unrelated sessions are ignored', () => {
  assert.equal(stripeResult({ ...session, payment_status: 'unpaid' }).p_status, 'open');
  assert.equal(stripeResult({ ...session, payment_status: 'unpaid', payment_intent: { status: 'processing' } }).p_status, 'open');
  assert.equal(stripeResult({ ...session, payment_status: 'unpaid', payment_intent: { status: 'canceled' } }).p_status, 'expired');
  assert.equal(stripeResult({ ...session, payment_status: 'unpaid' }, true).p_status, 'expired');
  assert.equal(stripeResult({ ...session, status: 'expired', payment_status: 'unpaid' }).p_status, 'expired');
  assert.equal(stripeResult({ ...session, metadata: {} }), null);
  assert.throws(() => stripeResult({ ...session, livemode: true }));
  assert.throws(() => stripeResult({ ...session, currency: 'usd' }));
  assert.throws(() => stripeResult({ ...session, client_reference_id: 'different' }));
});
