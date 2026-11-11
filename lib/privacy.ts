export const isDemoEmail = (email: string) => /^[^\s@]+@example\.test$/i.test(email);

export const localDemoRegistration = () => {
  const origin = process.env.APP_URL ?? 'http://localhost:3000';
  return process.env.VERCEL !== '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

export const privacyRequestLabels = {
  access: 'Access or a copy of my data',
  correction: 'Correct my data',
  erasure: 'Delete my data',
  restriction: 'Restrict use of my data',
  objection: 'Object to use of my data',
  portability: 'Transfer my data',
};

export type PrivacyRequestKind = keyof typeof privacyRequestLabels;
export type PrivacyActionState = { error?: string; notice?: string };
