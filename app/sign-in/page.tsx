import type { Metadata } from 'next';
import Link from 'next/link';
import { first, type SearchParams } from '@/lib/market-data';
import { supabaseConfig } from '@/lib/supabase/config';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

const SignInPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams;
  const area = first(params.area) === 'organiser' ? 'organiser' : 'stallholder';
  const register = area === 'stallholder' && first(params.mode) === 'register';

  return (
    <div className="container section">
      <div className="page-heading">
        <h1>{register ? 'Create a stallholder account' : area === 'organiser' ? 'Organiser sign in' : 'Stallholder sign in'}</h1>
        {first(params.error) === 'confirmation' && <p role="alert">The confirmation link could not be used. Try signing in or registering again.</p>}
      </div>
      {supabaseConfig() ? (
        <>
          <SignInForm area={area} register={register} key={`${area}-${register}`} />
          {area === 'stallholder' && (
            <Link className="text-action" href={register ? '/sign-in' : '/sign-in?mode=register'}>
              {register ? 'Already registered? Sign in' : 'Create a stallholder account'}
            </Link>
          )}
        </>
      ) : (
        <div className="panel detail-panel">
          <p>Account access requires a connected Supabase project. You can still browse the demo season and trading prices.</p>
          <Link className="button" href="/trade">See trading weekends</Link>
        </div>
      )}
    </div>
  );
};

export default SignInPage;
