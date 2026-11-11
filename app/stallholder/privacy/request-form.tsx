'use client';

import { useActionState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { privacyRequestLabels } from '@/lib/privacy';
import { requestPrivacy } from './actions';

export const PrivacyRequestForm = () => {
  const [state, action, pending] = useActionState(requestPrivacy, {});
  return (
    <form className="form-stack" action={action}>
      <label>Request type
        <select name="kind" defaultValue="" required>
          <option value="">Choose a request</option>
          {Object.entries(privacyRequestLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      {state.notice && <p role="status">{state.notice}</p>}
      <button className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Send privacy request'}</button>
    </form>
  );
};
