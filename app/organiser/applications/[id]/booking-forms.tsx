'use client';

import { useActionState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { checkPayment, offer, type ReviewState } from './actions';

const initial: ReviewState = {};

export const OfferForm = ({ id, pitches, price }: { id: string; pitches: { code: string; zone: string }[]; price: string }) => {
  const [state, action, pending] = useActionState(offer.bind(null, id), initial);
  return (
    <section className="panel">
      <h2>Offer a stall</h2>
      <p>Stall hire is {price}. The offer is held for up to 24 hours and ends before trading starts.</p>
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      <p role="status">{state.notice}</p>
      {pitches.length > 0 ? (
        <form className="form-stack" action={action}>
          <label>Available stall
            <select name="pitch" required defaultValue="">
              <option value="">Choose a stall</option>
              {pitches.map(({ code, zone }) => <option key={code} value={code}>{code} · {zone}</option>)}
            </select>
          </label>
          <button type="submit" className="button" disabled={pending}>{pending ? 'Saving…' : 'Send stall offer'}</button>
        </form>
      ) : <p>No stall is available for the full trading period.</p>}
    </section>
  );
};

export const CheckPaymentForm = ({ id, bookingId }: { id: string; bookingId: string }) => {
  const [state, action, pending] = useActionState(checkPayment.bind(null, id, bookingId), initial);
  return (
    <form className="form-stack booking-copy" action={action}>
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      <p role="status">{state.notice}</p>
      <button type="submit" className="button button-secondary" disabled={pending}>
        {pending ? 'Checking Stripe…' : 'Check payment status'}
      </button>
    </form>
  );
};
