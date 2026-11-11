'use server';

import { revalidatePath } from 'next/cache';
import { privacyRequestLabels, type PrivacyActionState } from '@/lib/privacy';
import { requireAccount } from '@/lib/supabase/server';

export const requestPrivacy = async (_state: PrivacyActionState, form: FormData): Promise<PrivacyActionState> => {
  const kind = String(form.get('kind') ?? '');
  if (!Object.hasOwn(privacyRequestLabels, kind)) return { error: 'Choose a request type.' };
  const { db } = await requireAccount('stallholder');
  const { data, error } = await db.rpc('request_privacy', { p_kind: kind });
  if (error) return { error: 'The request could not be saved. Try again in a moment.' };
  revalidatePath('/stallholder/privacy');
  return { notice: data ? 'Request received.' : 'You already have an open request of this type.' };
};
