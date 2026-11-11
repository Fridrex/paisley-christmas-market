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
  const result = await reconcileOverdue(paymentServices());
  return Response.json(result, { status: result.failed ? 500 : 200 });
};
