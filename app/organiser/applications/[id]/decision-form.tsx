'use client';

import { useActionState, useState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import type { ApplicationStatus } from '@/lib/applications';
import { review, type ReviewState } from './actions';

const initial: ReviewState = {};

export const DecisionForm = ({ id, current }: { id: string; current: ApplicationStatus }) => {
  const [state, action, pending] = useActionState(review.bind(null, id), initial);
  const [note, setNote] = useState('');
  return (
    <section className="panel">
      <h2>Review this application</h2>
      <p role="status">{state.notice}</p>
      {current !== 'declined' && (
        <form className="form-stack" action={action}>
          {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
          <label>Reason for declining
            <textarea name="note" value={note} onChange={(event) => setNote(event.target.value)}
              maxLength={500} aria-describedby="reason-hint" />
          </label>
          <p id="reason-hint">The stallholder will see this reason.</p>
          <div className="actions">
            {current === 'submitted' && (
              <button className="button" type="submit" name="status" value="under_review" disabled={pending}>Move to under review</button>
            )}
            <button className="button button-secondary" type="submit" name="status" value="declined" disabled={pending}>Decline application</button>
          </div>
        </form>
      )}
      {current === 'declined' && !state.notice && <p>This application has been declined.</p>}
    </section>
  );
};
