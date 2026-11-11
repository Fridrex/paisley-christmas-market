'use client';

import { ArrowUpRight, Snowflake } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const pages = [
  { href: '/whats-on', label: 'What’s on' },
  { href: '/traders', label: 'Traders' },
  { href: '/plan-your-visit', label: 'Plan your visit' },
  { href: '/trade', label: 'Trade with us' },
];

export const SiteHeader = () => {
  const path = usePathname();

  return (
    <header>
      <div className="utility">
        <div className="container utility-inner">
          <span>Demo season · December 2026</span>
          <Link href="/stallholder">Stallholder sign in <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className="container header-inner">
        <Link href="/" className="brand" aria-current={path === '/' ? 'page' : undefined}>
          <Snowflake size={25} strokeWidth={1.5} aria-hidden="true" />
          <span>Paisley <small>Christmas Market</small></span>
        </Link>
        <nav aria-label="Main navigation">
          {pages.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={href === '/trade' ? 'nav-trade' : undefined}
              aria-current={path === href ? 'page' : path.startsWith(`${href}/`) ? 'location' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
