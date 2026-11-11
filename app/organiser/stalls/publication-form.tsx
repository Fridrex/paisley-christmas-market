'use client';

import { useActionState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { setPublication } from './actions';

export const PublicationForm = ({ slug, name, published }: { slug: string; name: string; published: boolean }) => {
  const [state, action, pending] = useActionState(setPublication.bind(null, slug, !published), {});
  return (
    <form action={action} className="form-stack booking-copy">
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      <p role="status">{state.notice}</p>
      <button className="button button-secondary" type="submit" disabled={pending}
        aria-label={`${published ? 'Hide' : 'Publish'} ${name}`}>
        {pending ? 'Saving…' : published ? 'Hide listing' : 'Publish listing'}
      </button>
    </form>
  );
};
