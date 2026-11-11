'use client';

import { useActionState, useState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { signIn, type SignInState } from './actions';

const initial: SignInState = {};

export const SignInForm = ({ area, register }: { area: 'stallholder' | 'organiser'; register: boolean }) => {
  const [state, action, pending] = useActionState(signIn, initial);
  const [email, setEmail] = useState('');

  return (
    <form className="panel form-stack" action={action}>
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="intent" value={register ? 'register' : 'sign-in'} />
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      <p role="status">{state.notice}</p>
      <label>Email address
        <input name="email" type="email" autoComplete="email" maxLength={254} required
          value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>Password
        <input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'}
          required minLength={register ? 8 : undefined} aria-describedby={register ? 'password-hint' : undefined} />
      </label>
      {register && <p id="password-hint">Use at least 8 characters.</p>}
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
};
