import type { Metadata } from 'next';
import Link from 'next/link';
import type { ProfileDraft } from '@/lib/applications';
import { requireAccount } from '@/lib/supabase/server';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Business profile', robots: { index: false } };

const ProfilePage = async () => {
  const { db, userId, email } = await requireAccount('stallholder');
  const { data, error } = await db.from('trader_profiles').select('business_name,category,description,contact_email')
    .eq('user_id', userId).maybeSingle<ProfileDraft>();
  if (error) throw new Error('Your business profile could not be loaded.');
  return (
    <div className="container section">
      <Link className="text-action back-link" href="/stallholder">Back to stallholder area</Link>
      <div className="page-heading">
        <h1>Business profile</h1>
        <p>Save your business details to use in future stall applications.</p>
      </div>
      <ProfileForm profile={data ?? { business_name: '', category: '', description: '', contact_email: email }} />
    </div>
  );
};

export default ProfilePage;
