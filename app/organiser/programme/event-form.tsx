'use client';

import { useActionState, useState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { formatDay, formatTime, type MarketDay, type ProgrammeItem } from '@/lib/market-data';
import { saveEvent } from './actions';

export const EventForm = ({ event, days }: { event?: ProgrammeItem & { published: boolean }; days: MarketDay[] }) => {
  const [state, action, pending] = useActionState(saveEvent.bind(null, event?.id ?? null), {});
  const [values, setValues] = useState({
    title: event?.title ?? '', zone: event?.zone ?? '', date: event?.date ?? '',
    time: event ? formatTime(event.starts_at) : '', published: event?.published ?? false,
    cancelled: event?.status === 'cancelled',
  });
  const day = days.find(({ date }) => date === values.date);
  return (
    <form action={action} className="panel form-stack">
      {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
      <label>Event title<input name="title" value={values.title} required minLength={2} maxLength={100}
        onChange={(change) => setValues({ ...values, title: change.target.value })} /></label>
      <label>Location<input name="zone" value={values.zone} required minLength={2} maxLength={80}
        onChange={(change) => setValues({ ...values, zone: change.target.value })} /></label>
      <label>Trading day<select name="date" value={values.date} required
        onChange={(change) => setValues({ ...values, date: change.target.value })}>
        <option value="">Choose a day</option>
        {days.filter(({ opens_at }) => opens_at).map(({ date }) => (
          <option key={date} value={date}>{formatDay(date, true)}</option>
        ))}
      </select></label>
      <label>Start time<input name="time" type="time" value={values.time} required
        onChange={(change) => setValues({ ...values, time: change.target.value })}
        aria-describedby={day?.opens_at ? 'market-hours' : undefined} /></label>
      {day?.opens_at && day.closes_at && <p id="market-hours">Market hours {formatTime(day.opens_at)}–{formatTime(day.closes_at)}</p>}
      <label className="checkbox-label"><input type="checkbox" name="cancelled" checked={values.cancelled}
        onChange={(change) => setValues({ ...values, cancelled: change.target.checked })} /> Event cancelled</label>
      <label className="checkbox-label"><input type="checkbox" name="published" checked={values.published}
        onChange={(change) => setValues({ ...values, published: change.target.checked })} /> Show in public programme</label>
      <button type="submit" className="button" disabled={pending}>{pending ? 'Saving…' : 'Save event'}</button>
    </form>
  );
};
