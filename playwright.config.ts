import { defineConfig } from '@playwright/test';

const port = 3100;
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: { baseURL: url, channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url,
    timeout: 90_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' },
  },
});
