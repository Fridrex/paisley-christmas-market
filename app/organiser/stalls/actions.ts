'use server';

import { revalidatePath } from 'next/cache';
import { seasonSlug } from '@/lib/market-data';
import { requireOrganiser } from '@/lib/supabase/server';

export const setPublication = async (slug: string, published: boolean): Promise<{ error?: string; notice?: string }> => {
  const { db } = await requireOrganiser();
  const { data, error } = await db.rpc('set_listing_publication', {
    p_season: seasonSlug, p_slug: slug, p_published: published,
  });
  if (error) return { error: 'The stall publication could not be updated.' };
  if (!data) return { error: published ? 'A booked stall needs permission from its stallholder before it can be published.' : 'This stall could not be found.' };
  revalidatePath('/traders');
  revalidatePath(`/traders/${slug}`);
  revalidatePath('/plan-your-visit');
  revalidatePath('/organiser/stalls');
  return { notice: published ? 'Stall published.' : 'Stall hidden from the public catalogue and map.' };
};
