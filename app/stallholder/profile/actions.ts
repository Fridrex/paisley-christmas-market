'use server';

import { revalidatePath } from 'next/cache';
import { readProfile, type ApplicationState } from '@/lib/applications';
import { requireAccount } from '@/lib/supabase/server';

export const saveProfile = async (_state: ApplicationState & { notice?: string }, form: FormData): Promise<ApplicationState & { notice?: string }> => {
  const { db, userId } = await requireAccount('stallholder');
  const { draft, category, errors } = readProfile(form);
  if (!category || Object.keys(errors).length > 0) return { fields: errors };
  const { error } = await db.from('trader_profiles').upsert({ ...draft, category, user_id: userId });
  if (error) return { error: 'The profile couldn’t be saved. Try again in a moment.' };
  revalidatePath('/stallholder');
  return { notice: 'Business profile saved.' };
};
