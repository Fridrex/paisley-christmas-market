import { applicationStatuses, type Application } from '@/lib/applications';
import { formatRange, type TradingPeriod } from '@/lib/market-data';

export const ApplicationDetails = ({ application, period }: { application: Application; period?: TradingPeriod }) => {
  return (
    <section className="panel detail-panel">
      <p className="status">{applicationStatuses[application.status]}</p>
      <h2>Application details</h2>
      <dl className="review-list">
        <div><dt>Trading weekend</dt><dd>{period ? formatRange(period.starts_on, period.ends_on) : application.period_slug}</dd></div>
        <div><dt>Business category</dt><dd>{application.category}</dd></div>
        <div><dt>Products</dt><dd>{application.description}</dd></div>
        <div><dt>Contact email address</dt><dd>{application.contact_email}</dd></div>
        {application.decision_note && <div><dt>Decision</dt><dd>{application.decision_note}</dd></div>}
      </dl>
    </section>
  );
};
