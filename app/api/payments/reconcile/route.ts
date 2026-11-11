import { timingSafeEqual } from 'node:crypto';
import { paymentServices, paymentsConfigured, reconcileOverdue } from '@/lib/payments/service';

export const maxDuration = 60;

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !paymentsConfigured()) return new Response(null, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return new Response(null, { status: 401 });
  }
  const services = paymentServices();
  const result = await reconcileOverdue(services);
  const { data: removed, error } = await services.db.rpc('purge_expired_demo_data');
  if (error) console.error('Demo data retention job failed', { code: error.code });
  return Response.json({ ...result, removed: removed ?? 0 }, { status: result.failed || error ? 500 : 200 });
};
