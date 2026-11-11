import { createSessionClient } from '@/lib/supabase/server';

export const GET = async () => {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const db = await createSessionClient();
  if (!db) return new Response(null, { status: 503, headers });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401, headers });
  const { data, error } = await db.rpc('get_my_privacy_data');
  if (error) return new Response(null, { status: 500, headers });
  if (!data) return new Response(null, { status: 401, headers });
  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="paisley-demo-data.json"' },
  });
};
