import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy and cookies' };

const PrivacyPage = () => {
  const contact = process.env.PRIVACY_CONTACT_EMAIL;
  const operator = process.env.PRIVACY_CONTACT_NAME || 'The Paisley Christmas Market coursework team';

  return (
    <article className="container section">
      <div className="page-heading">
        <h1>Privacy and cookies</h1>
        <p className="intro">Paisley Christmas Market coursework demo. Updated 11 November 2026.</p>
      </div>
      <div className="panel form-stack">
        <section>
          <h2>Who runs the demo</h2>
          <p>{operator} runs this demonstration for assessment. Use the issued test account, fictional business details and Stripe test cards. Keep real names, contact details and payment details out of the forms.</p>
          <p>{contact
            ? <>For privacy questions, contact <a href={`mailto:${contact}`}>{contact}</a>.</>
            : 'If you have a privacy question and cannot sign in, ask the person who shared the demo to put you in touch with the coursework team.'}</p>
        </section>
        <section>
          <h2>What the demo uses and why</h2>
          <p>You can browse without an account. Hosting services process technical information such as IP addresses and request details to deliver, secure and troubleshoot the site. We rely on our legitimate interest in operating a secure coursework demonstration for this technical processing. The demo does not use advertising or visitor analytics.</p>
          <p>Supabase Auth stores the test email and a password hash. Supabase also stores fictional profiles, applications, booking and payment status, and privacy requests. The demo organiser can review applications for the season. Vercel hosts the site. Stripe Sandbox handles the test card form and returns the payment status. The app sends Stripe the booking reference, amount and return page, and does not collect card numbers. External travel links open the provider’s own site.</p>
          <p>The catalogue can show the fictional trading name, category, description, pitch and dates. It does not show the contact email. The organiser can publish a booked stall only after you allow it on your application. You can withdraw that permission in the same place.</p>
          <p>Our Supabase database is hosted in Ireland. Hosting and payment providers can process information in other countries. See the <a href="https://vercel.com/legal/privacy-policy">Vercel privacy policy</a>, <a href="https://supabase.com/legal/customer-resources/data-processing-addendum">Supabase data processing terms</a> and <a href="https://stripe.com/gb/privacy">Stripe privacy policy</a>. Ask the coursework team for details about a transfer and its safeguards.</p>
        </section>
        <section>
          <h2>How long information stays</h2>
          <p>Demo stallholder accounts and their records are due for deletion 30 days after the sample season ends. An unresolved request or booking can delay deletion until it is handled. Completed requests are removed after 30 days. Service logs, backups and Stripe test records follow the relevant provider’s retention settings.</p>
        </section>
        <section>
          <h2>Your choices and rights</h2>
          <p>In <Link href="/stallholder/privacy">Your data and privacy requests</Link> you can download your app records and request access, correction, deletion, restriction, objection or portability as applicable. The download covers the app’s records. Use a request for information it does not cover. We normally respond within one month. You can also <a href="https://ico.org.uk/make-a-complaint/">complain to the Information Commissioner’s Office</a>.</p>
        </section>
        <section>
          <h2>Cookies</h2>
          <p>Sign-in uses a necessary cookie to keep you signed in and, in local registration, to complete account verification. It expires eight hours after it was last issued, and signing out clears it. The hosted demo uses HTTPS and prevents page scripts from reading the cookie. Stripe may use its own cookies if you open its hosted Checkout.</p>
        </section>
      </div>
    </article>
  );
};

export default PrivacyPage;
