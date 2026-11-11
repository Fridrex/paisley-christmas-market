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
3. Create a stallholder account with a fictional `@example.test` address from the local sign-in screen. Open the local confirmation email at [localhost:54324](http://localhost:54324) and follow the link in the browser that started registration.
4. Create and confirm a separate test account for the organiser. Run the following in the local database as its administrator, substituting that account’s email.

```sql
insert into public.organiser_memberships (season_slug, user_id)
select 'paisley-2026', id from auth.users where email = 'organiser@example.test'
on conflict do nothing;
```

As the stallholder, save a business profile, choose a weekend, review your answers and submit. As the organiser, open `/organiser`, filter the queue and choose an available stall or decline the application with a reason. A second stallholder account should see only its own applications.

For a fresh hosted demo project, link the CLI with `npx supabase link --project-ref <project-ref>` and run `npx supabase db push --remote --include-seed` once. After seeding, use `npx supabase db push --remote` for subsequent migrations. Supabase CLI 3 targets the local database by default. Hosted sign-in uses pre-issued confirmed `@example.test` accounts. Public self-registration is available only with local email capture. The database rejects real email addresses for new auth identities, profiles and applications.

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
3. As the stallholder, open Checkout, cancel back to the offer, then reopen it. Use the [Stripe test cards](https://docs.stripe.com/testing#cards) to try a decline and a successful GBP payment. On return, refresh the booking status until it says **Confirmed**. The booking creates a hidden listing. Allow the listing as the stallholder, then publish it as the organiser and check the catalogue and map.
4. Resend the completed event and verify the booking stays confirmed with one published listing. Withhold a test event and use **Check payment status** on the organiser’s application page to reconcile it. For an overdue unpaid offer, verify that reconciliation frees all reserved days.
5. In **Manage programme**, change a start time and check that the public programme shows the earlier time. As the stallholder, withdraw listing permission and check that the listing disappears from the catalogue and map while its booking stays confirmed.

Offers last up to 24 hours. A new Checkout session needs at least 31 minutes before the offer deadline. An existing open session can be resumed until its deadline. Stripe’s expiry event reconciles an opened session. The organiser can check a booking immediately, and the scheduled job checks overdue offers daily.

## Deploy the demo

1. Create a private GitHub repository rooted in the folder containing this README. Review `git status --short --untracked-files=all` before staging and `git diff --cached --name-only` before committing. The repository allowlist covers application code, migrations, assets and tests. Coursework documents, design notes and local credentials stay on disk.
2. Create a fresh hosted Supabase project for the demo. Link it with `npx supabase link --project-ref <project-ref>`, review `npx supabase db push --remote --dry-run`, then apply the migrations and sample season with `npx supabase db push --remote --include-seed`. For later releases, apply new migrations with `npx supabase db push --remote`. [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
3. Import the GitHub repository into Vercel using the Next.js preset. Use the repository root, Node.js 26 and `main` as the production branch. Set the hosted values below in the **Production** environment and redeploy after changing them. Preview deployments with connected services should use their own data and webhook endpoint. [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
4. In Supabase Auth, use the stable HTTPS site origin as the Site URL. Issue confirmed fictional demo accounts through the Auth admin interface or API. Grant the demo organiser the season membership shown above.
5. In Stripe Sandbox, register a snapshot webhook at `<APP_URL>/api/stripe/webhook` for the four events listed above. Copy that endpoint’s signing secret to Vercel. The stable URL must accept Stripe’s requests. [Stripe webhooks](https://docs.stripe.com/webhooks)
6. Run the acceptance walkthrough against the deployed URL. Check sign-in, a test payment, webhook delivery, optional publication and withdrawal. The daily reconciliation and demo data cleanup share the schedule in `vercel.json`.

| Vercel variable | Hosted value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted Supabase project URL, e.g. `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key for that hosted project |
| `SUPABASE_SECRET_KEY` | Server secret key for that hosted project |
| `APP_URL` | Stable HTTPS site origin, e.g. `https://<app>.vercel.app` |
| `STRIPE_SECRET_KEY` | Secret API key from the Stripe Sandbox |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the HTTPS webhook endpoint in that Sandbox |
| `CRON_SECRET` | Random secret for the scheduled reconciliation route |
| `PRIVACY_CONTACT_NAME` | Public name of the team responsible for the demo |
| `PRIVACY_CONTACT_EMAIL` | Monitored public inbox for privacy requests |

Vercel Production hosts the coursework demo with sample data and Stripe test payments.

## Demo privacy operations

Keep the hosted project limited to fictional data. Publish the team's monitored privacy contact through the Vercel variables above. Avoid shared credentials for requests involving an identifiable person and verify identity through the mailbox before disclosing personal data. Ask for only the additional information needed to locate the request or verify identity. The public notice covers essential sign-in cookies, so the demo does not install a consent banner or analytics. Review that position before adding integrations.

Check the privacy inbox and the open request queue regularly. Log receipt and the response due date. Normally respond within one month. If an extension or refusal applies, tell the requester within the original period and explain the reason and how to complain. The queue is visible to project operators in Supabase, and each account can see its own requests in the app. Organiser access does not include other users’ requests.

```sql
select id, user_id, kind, created_at, created_at + interval '1 month' as review_due
from public.privacy_requests
where completed_at is null
order by created_at;
```

- For access and portability, start with the signed-in JSON download. Check relevant provider records and communications for anything outside that export, protect third-party information and deliver any additional copy through a verified channel.
- For correction, verify the correct fields and amend the source and any public copy. For restriction or objection, promptly hide the affected listing where applicable, restrict use while reviewing the request, and record the decision. Withdrawing listing permission hides the listing directly.
- For erasure, check whether any held offer, future booking or other justified retention applies. The operator can call `public.erase_demo_account('<verified-demo-user-uuid>'::uuid)` in the Supabase SQL editor after reviewing the request. It returns false for non-demo addresses, organisers and accounts with a held offer or future confirmed booking. Handle any provider copies and backups separately. Keep a minimal operational record outside the demo if needed to demonstrate how a real request was handled.
- Set `completed_at = now()` on the exact request row only after you have dealt with it and responded. The daily job deletes completed requests after 30 days. Starting 30 days after the demo season ends, it also clears eligible synthetic stallholder accounts and linked app records. It skips organiser accounts, open privacy requests and held offers.

Keep a short processing record for the demo. Confirm the team responsible, document the basis for essential delivery and security logs, review vendor terms and retention settings, and record any transfer safeguards. Supabase, Vercel and Stripe may have different roles for their own processing. Before real use, review the agreements and data locations, approve a retention schedule for real records, assess any restricted transfers and ensure the notice describes those decisions. For incidents, contain the issue, document it and use the ICO breach assessment to decide whether and when to notify the ICO or affected people. [ICO privacy information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) · [ICO individual rights](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/) · [ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) · [ICO international transfers](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/) · [ICO personal data breaches](https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/)

Vercel’s published processor DPA applies to Pro and Enterprise plans. For Hobby, check what terms cover the technical request data and whether an Article 28 contract is required for your use. Do not assume the published DPA covers this deployment. [Vercel DPA](https://vercel.com/legal/dpa)

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
