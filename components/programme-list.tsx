import { MapPin } from 'lucide-react';
import { type ProgrammeItem, formatTime } from '@/lib/market-data';

export const ProgrammeList = ({ items }: { items: ProgrammeItem[] }) => {
  return (
    <ul className="event-list">
      {items.map((item) => (
        <li key={item.id}>
          <div className="event-time">
            <time dateTime={`${item.date}T${formatTime(item.starts_at)}`}>
              {formatTime(item.starts_at)}
            </time>
          </div>
          <div>
            <h3>{item.title}</h3>
            <p className="icon-line"><MapPin size={16} aria-hidden="true" /> {item.zone}</p>
            {item.status === 'cancelled' && <p className="notice-inline">Cancelled</p>}
            {item.status === 'changed' && (
              <p className="notice-inline">New time{item.previous_start && ` · previously ${formatTime(item.previous_start)}`}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
