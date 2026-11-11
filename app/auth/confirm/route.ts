import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';

export const GET = async (request: Request) => {
  const code = new URL(request.url).searchParams.get('code');
  const db = await createSessionClient();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) redirect('/stallholder');
  }
  redirect('/sign-in?error=confirmation');
};
