'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { FormFeedback } from '@/components/form-feedback';
import { ProfileFields } from '@/components/profile-fields';
import { applicationFields, type ApplicationDraft, type ApplicationField, type ApplicationState } from '@/lib/applications';
import { formatPrice, formatRange, type TradingPeriod } from '@/lib/market-data';
import { submitApplication } from './actions';

const initial: ApplicationState = {};
const keys = Object.keys(applicationFields) as ApplicationField[];

export const ApplicationForm = ({ periods, defaults }: { periods: TradingPeriod[]; defaults: ApplicationDraft }) => {
  const [state, action, pending] = useActionState(submitApplication, initial);
  const [draft, setDraft] = useState(defaults);
  const [reviewedAfter, setReviewedAfter] = useState<ApplicationState | null>(null);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const wasReviewing = useRef(false);
  const fields = state.fields;
  const showReview = reviewedAfter !== null && (state === reviewedAfter || !fields);
  const period = periods.find((item) => item.slug === draft.period);

  useEffect(() => {
    if (showReview && !state.error) reviewTitle.current?.focus();
    if (reviewedAfter === null && wasReviewing.current) firstField.current?.focus();
    wasReviewing.current = showReview;
  }, [showReview, reviewedAfter, state.error]);

  if (showReview) {
    return (
      <form className="panel form-stack" action={action}>
        <h2 tabIndex={-1} ref={reviewTitle}>Check your answers</h2>
        {state.error && <FormFeedback focusOn={state}>{state.error}</FormFeedback>}
        <dl className="review-list">
          {keys.map((key) => (
            <div key={key}>
              <dt>{applicationFields[key]}</dt>
              <dd>{key === 'period' && period
                ? `${formatRange(period.starts_on, period.ends_on)} · ${formatPrice(period.price_pence)}`
                : draft[key]}</dd>
            </div>
          ))}
        </dl>
        {keys.map((key) => <input key={key} type="hidden" name={key} value={draft[key]} />)}
        <div className="actions">
          <button type="submit" className="button" disabled={pending}>{pending ? 'Submitting…' : 'Submit application'}</button>
          <button type="button" className="button button-secondary" onClick={() => setReviewedAfter(null)} disabled={pending}>Edit answers</button>
        </div>
      </form>
    );
  }

  return (
    <form method="post" className="panel form-stack" onSubmit={(event) => { event.preventDefault(); setReviewedAfter(state); }}>
      <h2>Stall application</h2>
      {fields && (
        <FormFeedback focusOn={state}>
          <strong>Check the following answers</strong>
          <ul>{keys.map((field) => fields[field] && <li key={field}><a href={`#${field}`}>{fields[field]}</a></li>)}</ul>
        </FormFeedback>
      )}
      <ProfileFields draft={draft} errors={fields} firstField={firstField}
        update={(field, value) => setDraft({ ...draft, [field]: value })} />
      <div className="form-field"><label htmlFor="period">{applicationFields.period}</label>
        <select id="period" name="period" required value={draft.period} aria-invalid={fields?.period ? true : undefined}
          aria-describedby={fields?.period ? 'period-error' : undefined}
          onChange={(event) => setDraft({ ...draft, period: event.target.value })}>
          <option value="">Choose a weekend</option>
          {periods.map((item) => (
            <option key={item.slug} value={item.slug}>{formatRange(item.starts_on, item.ends_on)} · {formatPrice(item.price_pence)}</option>
          ))}
        </select>
        {fields?.period && <span className="field-error" id="period-error">{fields.period}</span>}
      </div>
      <button type="submit" className="button">Review application</button>
    </form>
  );
};
