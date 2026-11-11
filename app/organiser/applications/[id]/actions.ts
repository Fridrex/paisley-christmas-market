'use server';

import { revalidatePath } from 'next/cache';
import { bookingColumns, type Booking } from '@/lib/bookings';
import { seasonSlug } from '@/lib/market-data';
import { paymentServices, paymentsConfigured, reconcileBooking } from '@/lib/payments/service';
import { requireOrganiser } from '@/lib/supabase/server';

export type ReviewState = { error?: string; notice?: string };

export const review = async (id: string, _state: ReviewState, form: FormData): Promise<ReviewState> => {
  const { db } = await requireOrganiser();
  const status = form.get('status');
  if (status !== 'under_review' && status !== 'declined') return { error: 'Choose an application decision.' };
  const note = String(form.get('note') ?? '').trim();
  if (status === 'declined' && (note.length < 3 || note.length > 500)) {
    return { error: 'Enter a reason between 3 and 500 characters.' };
  }
  const { data, error } = await db.rpc('review_application', { p_id: id, p_status: status, p_note: note });
  if (error) return { error: 'The decision couldn’t be saved. Try again in a moment.' };
  if (!data) return { error: 'This decision is no longer available. Refresh to see the latest status.' };
  revalidatePath(`/organiser/applications/${id}`);
  return { notice: status === 'declined' ? 'Application declined.' : 'Application moved to Under review.' };
};

export const offer = async (id: string, _state: ReviewState, form: FormData): Promise<ReviewState> => {
  const { db } = await requireOrganiser();
  const pitch = form.get('pitch');
  if (typeof pitch !== 'string' || !/^[A-Z0-9-]{1,12}$/.test(pitch)) return { error: 'Choose an available stall.' };
  const { error } = await db.rpc('offer_pitch', { p_application: id, p_pitch: pitch });
  revalidatePath(`/organiser/applications/${id}`);
  if (error?.code === '23505') return { error: 'That stall is no longer available for every day. Choose another stall.' };
  if (error) return { error: 'We couldn’t save the stall offer. Try again in a moment.' };
  revalidatePath('/organiser');
  return { notice: 'Offer saved. The stallholder can now see it in their account.' };
};

export const checkPayment = async (id: string, bookingId: string): Promise<ReviewState> => {
  const { db } = await requireOrganiser();
  if (!paymentsConfigured()) return { error: 'Connect Stripe and Supabase payment credentials before checking this booking.' };
  const { data, error } = await db.from('bookings').select(bookingColumns)
    .eq('id', bookingId).eq('application_id', id).eq('season_slug', seasonSlug).maybeSingle<Booking>();
  if (error || !data) return { error: 'The booking could not be found.' };
  try {
    await reconcileBooking(paymentServices(), data);
  } catch {
    console.error('Organiser reconciliation failed', { booking: bookingId });
    return { error: 'The payment could not be checked. The stall remains reserved while the status is unresolved.' };
  }
  revalidatePath(`/organiser/applications/${id}`);
  revalidatePath('/organiser');
  return { notice: 'Stripe has been checked. The booking details show the latest status.' };
};
