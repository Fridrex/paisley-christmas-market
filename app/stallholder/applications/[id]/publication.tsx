'use client';

import { useActionState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { changeListingPermission } from '../../actions';

export const ListingPermissionForm = ({ id, allowed }: { id: string; allowed: boolean }) => {
  const [state, action, pending] = useActionState(changeListingPermission.bind(null, id, !allowed), {});
  return (
    <form action={action} className="form-stack">
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      {state.notice && <p role="status">{state.notice}</p>}
      <button className="button button-secondary" type="submit" disabled={pending}>
        {pending ? 'Saving…' : allowed ? 'Withdraw listing permission' : 'Allow this listing'}
      </button>
    </form>
  );
};
