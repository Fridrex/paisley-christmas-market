'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isUuid } from '@/lib/bookings';
import { seasonSlug } from '@/lib/market-data';
import { requireOrganiser } from '@/lib/supabase/server';

export const saveEvent = async (id: string | null, _state: { error?: string }, form: FormData): Promise<{ error?: string }> => {
  const { db } = await requireOrganiser();
  const date = String(form.get('date') ?? '');
  const time = String(form.get('time') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const zone = String(form.get('zone') ?? '').trim();
  if ((id && !isUuid(id)) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)
    || title.length < 2 || title.length > 100 || zone.length < 2 || zone.length > 80) {
    return { error: 'Check the event title, location, trading day and start time.' };
  }
  const { error } = await db.rpc('save_programme_item', {
    p_season: seasonSlug, p_id: id, p_date: date, p_time: time, p_title: title, p_zone: zone,
    p_cancelled: form.get('cancelled') === 'on', p_published: form.get('published') === 'on',
  });
  if (error?.code === '22023') return { error: 'Choose a start time within the market opening hours for this day.' };
  if (error) return { error: 'The event could not be saved. Try again in a moment.' };
  revalidatePath('/whats-on');
  revalidatePath('/');
  redirect('/organiser/programme?saved=1');
};
