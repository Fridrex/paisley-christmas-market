import { isUuid, type PreparedCheckout } from '@/lib/bookings';
import { openCheckout, paymentServices, paymentsConfigured } from '@/lib/payments/service';
import { createSessionClient } from '@/lib/supabase/server';

const go = (location: string) => {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
};

export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isUuid(id)) return new Response(null, { status: 404 });
  const details = `/stallholder/applications/${id}`;
  if (!paymentsConfigured()) return go(`${details}?checkout=unavailable`);
  const services = paymentServices();
  if (request.headers.get('origin') !== services.origin) return new Response(null, { status: 403 });

  const db = await createSessionClient();
  const claims = await db?.auth.getClaims();
  if (!db || !claims?.data?.claims.sub) return go('/sign-in?area=stallholder');

  const body = await request.formData().catch(() => null);
  const booking = body?.get('booking');
  if (typeof booking !== 'string' || !isUuid(booking)) return new Response(null, { status: 400 });
  const match = await db.from('bookings').select('id').eq('id', booking).eq('application_id', id).maybeSingle();
  if (match.error) return go(`${details}?checkout=error`);
  if (!match.data) return new Response(null, { status: 404 });
  const { data, error } = await db.rpc('prepare_checkout', { p_booking: booking });
  if (error?.code === '42501') return new Response(null, { status: 404 });
  if (error) return go(`${details}?checkout=error`);
  if (!data) return go(`${details}?checkout=unavailable`);

  try {
    const result = await openCheckout(services, data as PreparedCheckout);
    return result.status === 'ready' ? go(result.url) : go(`${details}?checkout=${result.status}`);
  } catch {
    console.error('Checkout could not be opened', { booking });
    return go(`${details}?checkout=error`);
  }
};
