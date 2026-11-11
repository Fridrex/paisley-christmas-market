import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { Snowflake } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

const fraunces = localFont({
  src: '../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-standard-normal.woff2',
  variable: '--font-fraunces', weight: '100 900', display: 'swap', fallback: ['Georgia'],
});
const dmSans = localFont({
  src: '../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-standard-normal.woff2',
  variable: '--font-dm-sans', weight: '100 1000', display: 'swap', fallback: ['Arial'],
});

export const metadata: Metadata = {
  title: { default: 'Paisley Christmas Market', template: '%s | Paisley Christmas Market' },
  description: 'Explore the demo Paisley Christmas Market programme, traders and visitor information.',
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer>
          <div className="container footer-inner">
            <div>
              <Link className="brand" href="/">
                <Snowflake size={24} strokeWidth={1.5} aria-hidden="true" />
                <span>Paisley <small>Christmas Market</small></span>
              </Link>
              <p>A student project with sample dates, traders and stall locations.</p>
            </div>
            <nav aria-label="Footer navigation">
              <Link href="/plan-your-visit#access">Accessibility</Link>
              <Link href="/trade">Trading information</Link>
              <Link href="/privacy">Privacy and cookies</Link>
              <Link href="/organiser">Organiser area</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
};

export default RootLayout;
