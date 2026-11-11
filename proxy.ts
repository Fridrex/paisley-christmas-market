import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';

export const proxy = async (request: NextRequest) => {
  const config = supabaseConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;

  const cacheHeaders = new Headers({ 'Cache-Control': 'private, no-store' });
  const db = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        for (const cookie of previousCookies) response.cookies.set(cookie);
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) cacheHeaders.set(name, value);
      },
    },
  });
  await db.auth.getClaims();
  cacheHeaders.forEach((value, name) => response.headers.set(name, value));
  return response;
};

export const config = { matcher: ['/sign-in', '/stallholder/:path*', '/organiser/:path*'] };
