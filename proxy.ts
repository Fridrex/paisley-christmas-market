import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { isLegacyCookie, secureCookies, sessionCookie, sessionCookieWrite } from '@/lib/supabase/session-cookies';

export const proxy = async (request: NextRequest) => {
  const config = supabaseConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;

  for (const { name } of request.cookies.getAll()) {
    if (isLegacyCookie(name, config.url)) {
      response.cookies.set(name, '', { path: '/', maxAge: 0, secure: secureCookies(), httpOnly: true });
    }
  }
  const cacheHeaders = new Headers({ 'Cache-Control': 'private, no-store' });
  const db = createServerClient(config.url, config.key, {
    cookieOptions: sessionCookie(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        for (const cookie of previousCookies) response.cookies.set(cookie);
        for (const { name, value, options } of items) response.cookies.set(name, value, sessionCookieWrite(options));
        for (const [name, value] of Object.entries(headers)) cacheHeaders.set(name, value);
      },
    },
  });
  await db.auth.getClaims();
  cacheHeaders.forEach((value, name) => response.headers.set(name, value));
  return response;
};

export const config = { matcher: ['/sign-in', '/auth/confirm', '/stallholder/:path*', '/organiser/:path*'] };
