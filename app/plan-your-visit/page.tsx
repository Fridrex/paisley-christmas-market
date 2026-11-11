import type { Metadata } from 'next';
import { ArrowRight, Accessibility, MapPin, TrainFront } from 'lucide-react';
import Link from 'next/link';
import { first, formatDay, formatTime, type SearchParams } from '@/lib/market-data';
import { getMarketDays, getPitches, getSeason, getTraders } from '@/lib/market';

export const metadata: Metadata = { title: 'Plan your visit' };

const walkingDirections = 'https://www.google.com/maps/dir/?api=1&origin=Paisley+Gilmour+Street+Station&destination=High+Street%2C+Paisley&travelmode=walking';
const railAccess = 'https://www.scotrail.co.uk/media/83850/download?inline=';

const VisitPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const [days, pitches, season, params] = await Promise.all([getMarketDays(), getPitches(), getSeason(), searchParams]);
  const openDays = days.filter(({ opens_at }) => opens_at);
  const requestedDay = first(params.day);
  const requestedStall = first(params.stall);
  const day = openDays.find(({ date }) => date === requestedDay) ?? openDays[0];
  const selected = pitches.find(({ code }) => code === requestedStall);
  const listings = day ? await getTraders(day.date) : [];
  const tradersByStall = new Map(listings.map((trader) => [trader.pitch_code, trader]));
  const selectedTrader = selected && tradersByStall.get(selected.code);
  const zones = Map.groupBy(pitches, ({ zone }) => zone);

  return (
    <div className="container section">
      <div className="page-heading">
        <h1>Plan your visit</h1>
        <p className="intro icon-line"><MapPin aria-hidden="true" /> {season.location}, Paisley, Renfrewshire</p>
        <p>Check the opening hours, get directions from the station and see where the traders will be.</p>
      </div>
      <div className="two-columns visit-guides">
        <section className="panel">
          <TrainFront className="section-icon" aria-hidden="true" />
          <h2>Getting here</h2>
          <p>From Paisley Gilmour Street station, walk south towards the High Street.</p>
          <a className="text-action" href={walkingDirections}>Get walking directions <ArrowRight size={17} aria-hidden="true" /></a>
          <Link className="text-action" href="/whats-on">See daily opening hours <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
        <section id="access" className="panel">
          <Accessibility className="section-icon" aria-hidden="true" />
          <h2>Access and facilities</h2>
          <p>ScotRail lists step-free access to all platforms at Paisley Gilmour Street.</p>
          <a className="text-action" href={railAccess}>ScotRail station accessibility (PDF) <ArrowRight size={17} aria-hidden="true" /></a>
          <p>The demo uses an east entrance from the town centre and a west entrance along the High Street. Step-free event entrances, toilets and drop-off points are unconfirmed.</p>
        </section>
      </div>
      <section id="stalls" className="programme-section" aria-labelledby="stalls-heading">
        <h2 id="stalls-heading">Find a stall</h2>
        <p>Sample High Street layout</p>
        {day && (
          <form action="/plan-your-visit#stalls" className="filter-form day-filter">
            <label>Trading day<select name="day" key={day.date} defaultValue={day.date}>
              {openDays.map((item) => <option key={item.date} value={item.date}>{formatDay(item.date, true)}</option>)}
            </select></label>
            {selected && <input type="hidden" name="stall" value={selected.code} />}
            <button className="button" type="submit">Show stalls</button>
          </form>
        )}
        <div className="two-columns stall-layout">
          <div>
            {day?.opens_at && day.closes_at && <p>{formatDay(day.date, true)} · {formatTime(day.opens_at)}–{formatTime(day.closes_at)}</p>}
            {selected && (
              <div className="panel selected-stall" role="status">
                <strong>Stall {selected.code} · {selected.zone}</strong>
                <p>{selectedTrader
                  ? <Link href={`/traders/${selectedTrader.slug}?day=${day.date}`}>{selectedTrader.name}</Link>
                  : 'No trader listed for this day.'}</p>
              </div>
            )}
            <ul className="stall-list" aria-label="Stalls and traders">
              {pitches.map(({ code, zone }) => {
                const trader = tradersByStall.get(code);
                return (
                  <li key={code} id={`stall-${code}`}>
                    <strong>{code}</strong>
                    <div>{trader ? <Link href={`/traders/${trader.slug}?day=${day.date}`}>{trader.name}</Link> : 'No trader listed'}<br /><small>{zone}</small></div>
                  </li>
                );
              })}
            </ul>
            <h3>Entrances</h3>
            <ul className="entrances">
              <li><strong>East entrance</strong> · Town centre end of the High Street walkway</li>
              <li><strong>West entrance</strong> · Upper High Street end of the walkway</li>
            </ul>
          </div>
          <details className="panel map" open={selected ? true : undefined}>
            <summary>Open stall map</summary>
            <div className="map-content">
              {[...zones].map(([zone, stalls], index) => (
                <div key={zone}>
                  {index > 0 && <p className="aisle">West entrance ← High Street → East entrance</p>}
                  <p>{zone}</p>
                  <div className="map-row">
                    {stalls.map(({ code }) => (
                      <Link key={code} aria-label={`Select stall ${code}`} aria-current={selected?.code === code ? 'true' : undefined}
                        href={`/plan-your-visit?day=${day?.date ?? ''}&stall=${code}#stalls`}>{code}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>
    </div>
  );
};

export default VisitPage;
