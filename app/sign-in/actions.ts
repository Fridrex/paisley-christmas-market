'use server';

import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';

export type SignInState = { error?: string; notice?: string };

export const signIn = async (_state: SignInState, form: FormData): Promise<SignInState> => {
  const db = await createSessionClient();
  if (!db) return { error: 'Sign-in is unavailable in the public preview.' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email address and password.' };
  const area = form.get('area') === 'organiser' ? 'organiser' : 'stallholder';
  if (form.get('intent') === 'register' && area === 'stallholder') {
    if (password.length < 8) return { error: 'Use a password with at least 8 characters.' };
    const base = process.env.APP_URL ?? 'http://localhost:3000';
    const { data, error } = await db.auth.signUp({
      email, password, options: { emailRedirectTo: new URL('/auth/confirm', base).href },
    });
    if (error) return { error: 'We couldn’t register this account. Check your email address and password, then try again.' };
    if (!data.session) return { notice: 'Check your email for a confirmation link. Open it in this browser.' };
  } else {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Check your email address and password. If you just registered, confirm your email address first.' };
  }
  redirect(`/${area}`);
};

export const signOut = async () => {
  const db = await createSessionClient();
  if (db) {
    const { error } = await db.auth.signOut({ scope: 'local' });
    if (error) throw new Error('The account could not be signed out.');
  }
  redirect('/');
};
