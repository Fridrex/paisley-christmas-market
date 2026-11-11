'use server';

import { redirect } from 'next/navigation';
import { readProfile, type ApplicationState } from '@/lib/applications';
import { seasonSlug } from '@/lib/market-data';
import { requireAccount } from '@/lib/supabase/server';

export const submitApplication = async (_state: ApplicationState, form: FormData): Promise<ApplicationState> => {
  const { db } = await requireAccount('stallholder');
  const { draft, category, errors } = readProfile(form);
  const period = String(form.get('period') ?? '').trim();
  if (!period) errors.period = 'Choose a trading weekend.';
  if (Object.keys(errors).length > 0) return { fields: errors };

  const { data, error } = await db.rpc('submit_application', {
    p_season: seasonSlug, p_period: period, p_name: draft.business_name,
    p_category: category, p_description: draft.description, p_email: draft.contact_email,
  });
  if (error?.code === '23505') return { fields: { period: 'You’ve already applied for this weekend.' } };
  if (error?.code === '22023') return { fields: { period: 'This weekend is closed to applications. Choose another weekend.' } };
  if (error || typeof data !== 'string') return { error: 'We couldn’t submit your application. Try again in a moment.' };
  redirect(`/stallholder/applications/${data}`);
};
