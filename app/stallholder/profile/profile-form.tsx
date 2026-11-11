'use client';

import { useActionState, useState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { ProfileFields } from '@/components/profile-fields';
import type { ProfileDraft } from '@/lib/applications';
import { saveProfile } from './actions';

export const ProfileForm = ({ profile }: { profile: ProfileDraft }) => {
  const [draft, setDraft] = useState(profile);
  const [state, action, pending] = useActionState(saveProfile, {});
  const fields = Object.entries(state.fields ?? {});
  return (
    <form action={action} className="panel form-stack">
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      {fields.length > 0 && (
        <FormFeedback focusOn={state}>
          <strong>Check the following answers</strong>
          <ul>{fields.map(([field, message]) => <li key={field}><a href={`#${field}`}>{message}</a></li>)}</ul>
        </FormFeedback>
      )}
      <p role="status">{state.notice}</p>
      <ProfileFields draft={draft} errors={state.fields} update={(field, value) => setDraft({ ...draft, [field]: value })} />
      <button className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
};
