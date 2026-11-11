import type { Metadata } from 'next';
import Link from 'next/link';
import { ProgrammeList } from '@/components/programme-list';
import { Reveal } from '@/components/reveal';
import { first, formatDay, formatTime, type SearchParams } from '@/lib/market-data';
import { getMarketDays, getProgramme } from '@/lib/market';

export const metadata: Metadata = { title: 'What’s on' };

const ProgrammePage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const [days, params] = await Promise.all([getMarketDays(), searchParams]);
  const requestedDay = first(params.day);
  const day = days.find(({ date }) => date === requestedDay) ?? days.find(({ opens_at }) => opens_at);
  const items = day?.opens_at ? await getProgramme(day.date) : [];
  const nextOpen = day && days.find(({ date, opens_at }) => date > day.date && opens_at);

  return (
    <div className="container section">
      <div className="page-heading">
        <h1>What’s on</h1>
        <p className="intro">Live music, workshops and carols on Paisley High Street.</p>
      </div>
      <form action="/whats-on" className="filter-form day-filter">
        <label>
          Programme day
          <select key={day?.date} name="day" defaultValue={day?.date} required>
            {days.map(({ date, opens_at }) => (
              <option key={date} value={date}>{formatDay(date, true)}{!opens_at && ' (closed)'}</option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">Show programme</button>
      </form>
      <section aria-labelledby="programme-day" className="programme-section" aria-live="polite">
        <h2 id="programme-day">{day ? formatDay(day.date, true) : 'Programme'}</h2>
        {day?.opens_at && day.closes_at ? (
          <p>Market hours <strong>{formatTime(day.opens_at)}–{formatTime(day.closes_at)}</strong></p>
        ) : day ? (
          <p>Closed on this day. {nextOpen && <>Next open <Link href={`/whats-on?day=${nextOpen.date}`}>{formatDay(nextOpen.date, true)}</Link>.</>}</p>
        ) : null}
        <Reveal key={day?.date}>{items.length > 0
          ? <ProgrammeList items={items} />
          : (!day || day.opens_at) && <p className="empty">There are no events listed for this day.</p>}</Reveal>
      </section>
    </div>
  );
};

export default ProgrammePage;
