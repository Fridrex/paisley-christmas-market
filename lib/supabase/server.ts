import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { seasonSlug } from '@/lib/market-data';
import { supabaseConfig } from './config';

export const createSessionClient = async () => {
  const jar = await cookies();
  const config = supabaseConfig();
  if (!config) return null;

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) jar.set(name, value, options);
        } catch {
          // Server components receive refreshed cookies from the proxy.
        }
      },
    },
  });
};

export const requireAccount = cache(async (area: 'stallholder' | 'organiser') => {
  const db = await createSessionClient();
  if (!db) redirect(`/sign-in?area=${area}`);
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect(`/sign-in?area=${area}`);
  return { db, userId: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' };
});

export const requireOrganiser = cache(async () => {
  const account = await requireAccount('organiser');
  const { data, error } = await account.db.from('organiser_memberships')
    .select('season_slug').eq('season_slug', seasonSlug).eq('user_id', account.userId).maybeSingle();
  if (error) throw new Error('The organiser membership could not be loaded.');
  if (!data) redirect('/stallholder?notice=organiser-access');
  return account;
});
