import type { CookieOptions } from '@supabase/ssr';

export const secureCookies = () => process.env.VERCEL === '1' || process.env.APP_URL?.startsWith('https://') === true;

export const sessionCookie = () => {
  const secure = secureCookies();
  return { name: secure ? '__Host-paisley-session' : 'paisley-session', secure, httpOnly: true, sameSite: 'lax' as const, path: '/' };
};

export const sessionCookieWrite = (options: CookieOptions): CookieOptions => ({
  ...options,
  maxAge: options.maxAge === 0 ? 0 : 8 * 60 * 60,
});

export const isLegacyCookie = (name: string, url: string) => {
  const prefix = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  return name === prefix || name.startsWith(`${prefix}.`) || name.startsWith(`${prefix}-code-verifier`);
};
