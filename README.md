# Paisley Christmas Market

A Next.js and Supabase student project for a sample market on Paisley High Street in December 2026. The programme, trading prices, sellers and market layout are demonstration data.

## Run the public preview

Use Node.js 26 LTS. Run these commands from the directory containing this README.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). With the Supabase variables unset, the public pages use the bundled demo season. You can choose a programme day, search and filter the traders, open a trader’s stall and view trading prices.

## Enable accounts and applications

1. Start Docker and run `npx supabase start` to use the project’s Supabase CLI. A fresh local stack applies the migrations and loads the sample season. Use `npx supabase db push` to apply new migrations to an existing local stack.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `npx supabase status`. Keep `APP_URL=http://localhost:3000` for the local app and restart Next.js.
3. Create a stallholder account from the sign-in screen. Open the local confirmation email at [localhost:54324](http://localhost:54324) and follow the link in the browser that started registration.
4. Create and confirm a separate test account for the organiser. Run the following in the local database as its administrator, substituting that account’s email.

```sql
insert into public.organiser_memberships (season_slug, user_id)
select 'paisley-2026', id from auth.users where email = 'organiser@example.test'
on conflict do nothing;
```

As the stallholder, save a business profile, choose a weekend, review your answers and submit. As the organiser, open `/organiser`, filter the queue and choose an available stall or decline the application with a reason. A second stallholder account should see only its own applications.

For a fresh hosted demo project, link the CLI with `npx supabase link --project-ref <project-ref>` and run `npx supabase db push --remote --include-seed` once. After seeding, use `npx supabase db push --remote` for subsequent migrations. Supabase CLI 3 targets the local database by default. In Auth, set the Site URL to the app origin and allow the app’s `/auth/confirm` URL. Keep the Supabase confirmation URL in the confirmation email template. Open the confirmation link in the browser that began registration.

## Enable Stripe test payments

Set `SUPABASE_SECRET_KEY` to the project’s server secret key, `STRIPE_SECRET_KEY` to a Stripe test secret key and `APP_URL` to the exact origin used in the browser. Keep card payments enabled in the Stripe test environment. The Supabase key and Stripe secrets belong in `.env.local` or the host’s private environment settings.

With the [Stripe CLI](https://docs.stripe.com/cli/listen) signed in to the same test environment, start local event forwarding.

```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to http://127.0.0.1:3000/api/stripe/webhook
```

Set `STRIPE_WEBHOOK_SECRET` to the signing secret shown by the listener and restart Next.js. For a hosted deployment, register the same four snapshot events at `https://<demo-host>/api/stripe/webhook` and use the signing secret for that endpoint.

## Acceptance walkthrough

1. On a phone, open Saturday’s programme, filter traders by day and category, then open a trader’s stall and the walking directions from the station.
2. As a stallholder, submit for an open weekend. As the organiser, offer an available stall. Check that a second application for the same dates can’t take that stall.
3. As the stallholder, open Checkout, cancel back to the offer, then reopen it. Use the [Stripe test cards](https://docs.stripe.com/testing#cards) to try a decline and a successful GBP payment. On return, refresh the booking status until it says **Confirmed**. The stall should appear in the catalogue and on the map for its booked dates.
4. Resend the completed event and verify the booking stays confirmed with one published listing. Withhold a test event and use **Check payment status** on the organiser’s application page to reconcile it. For an overdue unpaid offer, verify that reconciliation frees all reserved days.
5. In **Manage programme**, change a start time and check that the public programme shows the earlier time. In **Manage stall publication**, hide the listing and verify that it disappears from the catalogue and the map while its booking stays confirmed.

Offers last up to 24 hours. A new Checkout session needs at least 31 minutes before the offer deadline. An existing open session can be resumed until its deadline. Stripe’s expiry event reconciles an opened session. The organiser can check a booking immediately, and the scheduled job checks overdue offers daily.

## Deploy the demo

1. Create a private GitHub repository rooted in the folder containing this README. Review `git status --short --untracked-files=all` before staging and `git diff --cached --name-only` before committing. The repository allowlist covers application code, migrations, assets and tests. Coursework documents, design notes and local credentials stay on disk.
2. Create a fresh hosted Supabase project for the demo. Link it with `npx supabase link --project-ref <project-ref>`, review `npx supabase db push --remote --dry-run`, then apply the migrations and sample season with `npx supabase db push --remote --include-seed`. For later releases, apply new migrations with `npx supabase db push --remote`. [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
3. Import the GitHub repository into Vercel using the Next.js preset. Use the repository root, Node.js 26 and `main` as the production branch. Set the hosted values below in the **Production** environment and redeploy after changing them. Preview deployments with connected services should use their own data and webhook endpoint. [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
4. In Supabase Auth, use the stable HTTPS site origin as the Site URL and allow `<APP_URL>/auth/confirm`. Configure custom SMTP for registration by external users. Create a confirmed demo organiser account and grant it the season membership shown above. [Supabase Auth email delivery](https://supabase.com/docs/guides/auth/auth-smtp)
5. In Stripe Sandbox, register a snapshot webhook at `<APP_URL>/api/stripe/webhook` for the four events listed above. Copy that endpoint’s signing secret to Vercel. The stable URL must accept Stripe’s requests. [Stripe webhooks](https://docs.stripe.com/webhooks)
6. Run the acceptance walkthrough against the deployed URL. Check email confirmation, a test payment, the webhook delivery, and the stall’s publication. The daily reconciliation schedule is already defined in `vercel.json`.

| Vercel variable | Hosted value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted Supabase project URL, e.g. `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key for that hosted project |
| `SUPABASE_SECRET_KEY` | Server secret key for that hosted project |
| `APP_URL` | Stable HTTPS site origin, e.g. `https://<app>.vercel.app` |
| `STRIPE_SECRET_KEY` | Secret API key from the Stripe Sandbox |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the HTTPS webhook endpoint in that Sandbox |
| `CRON_SECRET` | Random secret for the scheduled reconciliation route |

Vercel Production hosts the coursework demo with sample data and Stripe test payments.

## Verification

```sh
npm run lint
npm run typecheck
npm run test:payments
npm run build
npx playwright install chromium
npm run test:e2e
```

Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome instead of downloading Playwright Chromium. The browser suite uses demo data and checks the public journeys, account redirects and automated accessibility at 320 CSS px.

Run the database assertions against the seeded local Supabase instance. The assertions roll back the test users and data.

```sh
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -f tests/database.sql -f tests/bookings.sql
```

## Assets

- The cover is an artist’s impression from the original design preview. Its caption identifies the illustration in the app.
- Fraunces and DM Sans are served locally from the Fontsource WOFF2 packages. Their SIL Open Font Licences ship with the respective packages. Icons are from Lucide.
- The event layout and facilities are examples. Station access is sourced from [ScotRail’s station accessibility information](https://www.scotrail.co.uk/media/83850/download?inline=).
