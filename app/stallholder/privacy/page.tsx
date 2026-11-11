import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDay } from '@/lib/market-data';
import { privacyRequestLabels, type PrivacyRequestKind } from '@/lib/privacy';
import { requireAccount } from '@/lib/supabase/server';
import { PrivacyRequestForm } from './request-form';

export const metadata: Metadata = { title: 'Your data and privacy requests', robots: { index: false } };

const PrivacyRequestsPage = async () => {
  const { db, userId } = await requireAccount('stallholder');
  const { data, error } = await db.from('privacy_requests').select('id,kind,created_at,completed_at')
    .eq('user_id', userId).order('created_at', { ascending: false })
    .returns<{ id: string; kind: PrivacyRequestKind; created_at: string; completed_at: string | null }[]>();
  if (error) throw new Error('Your privacy requests could not be loaded.');

  return (
    <div className="container section">
      <Link className="text-action back-link" href="/stallholder">Back to stallholder area</Link>
      <div className="page-heading">
        <h1>Your data and privacy requests</h1>
        <p><Link href="/privacy">Privacy and cookies</Link></p>
      </div>
      <div className="two-columns">
        <section className="panel form-stack">
          <h2>Download your app data</h2>
          <p>The JSON file includes your account details, profile, applications, booking and payment status, listings and privacy requests.</p>
          <a className="button button-secondary" href="/stallholder/privacy/download" download>Download your data</a>
          <Link className="text-action" href="/stallholder/profile">Correct your business profile</Link>
        </section>
        <section className="panel form-stack">
          <h2>Make a privacy request</h2>
          <PrivacyRequestForm />
          {data.length > 0 && (
            <ul className="price-list" role="list">
              {data.map((item) => (
                <li key={item.id}>
                  <span>{privacyRequestLabels[item.kind]} · {formatDay(item.created_at.slice(0, 10))}</span>
                  <span>{item.completed_at ? 'Closed' : 'Open'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default PrivacyRequestsPage;
