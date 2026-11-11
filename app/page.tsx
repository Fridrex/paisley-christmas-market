import { ArrowDownRight, ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ProgrammeList } from '@/components/programme-list';
import { formatDay, formatRange, formatTime } from '@/lib/market-data';
import { getMarketDays, getProgramme, getSeason } from '@/lib/market';

const HomePage = async () => {
  const [season, days] = await Promise.all([getSeason(), getMarketDays()]);
  const opening = days.find((day) => day.opens_at);
  const openingEvents = opening ? await getProgramme(opening.date) : [];

  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <p className="eyebrow">December in Renfrewshire</p>
          <h1>Paisley<br />Christmas<br className="hero-break" /> Market</h1>
          <p className="intro">Independent makers, winter food and a High Street lit for Christmas.</p>
          <dl className="hero-facts">
            <div>
              <dt><CalendarDays size={19} aria-hidden="true" /><span className="sr-only">Dates</span></dt>
              <dd>{formatRange(season.starts_on, season.ends_on)} {season.starts_on.slice(0, 4)}</dd>
            </div>
            {opening?.opens_at && opening.closes_at && (
              <div>
                <dt><Clock3 size={19} aria-hidden="true" /><span className="sr-only">Opening hours</span></dt>
                <dd>Fri–Sun, {formatTime(opening.opens_at)}–{formatTime(opening.closes_at)}</dd>
              </div>
            )}
            <div>
              <dt><MapPin size={19} aria-hidden="true" /><span className="sr-only">Location</span></dt>
              <dd>{season.location}</dd>
            </div>
          </dl>
          <div className="actions">
            <Link className="button" href="/plan-your-visit">Plan your visit <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className="text-action" href="/whats-on">See what’s on <ArrowDownRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <figure className="hero-art">
          <Image
            src="/paisley-market-illustration.webp"
            alt="Wooden market stalls and strings of lights along a winter street at dusk"
            width={1200} height={800}
            sizes="(max-width: 760px) calc(100vw - 32px), 58vw"
            preload
          />
          <figcaption>Artist’s impression</figcaption>
        </figure>
      </section>
      <section className="opening">
        <div className="container opening-inner">
          <div>
            {opening && <p className="eyebrow">{formatDay(opening.date, true)}</p>}
            <h2>Opening day</h2>
            <Link className="text-action" href="/whats-on">Full programme <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          {openingEvents.length > 0 ? <ProgrammeList items={openingEvents} /> : <p>Programme details are still to be announced.</p>}
        </div>
      </section>
      <section className="container section home-links">
        <Link href="/traders" className="panel feature-link">
          <div><h2>Meet the traders</h2><p>Find ceramics, Scottish fudge and handmade gifts.</p></div>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link href="/trade" className="panel feature-link">
          <div><h2>Trade with us</h2><p>See stall prices and available trading weekends.</p></div>
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </>
  );
};

export default HomePage;
