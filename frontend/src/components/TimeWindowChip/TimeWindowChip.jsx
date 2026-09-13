import { formatPickup, formatTimeWindow } from '../../lib/format';
import t from '../../i18n/ru';

// `date` (box.pickup_date) is optional: when present we apply the display rule
// "Сегодня HH:MM–HH:MM". `compact` drops the day prefix for tight layouts.
export default function TimeWindowChip({ start, end, date, compact }) {
  const label = compact
    ? formatTimeWindow(start, end)
    : formatPickup(start, end, date, t.today);
  return (
    <span className="time-chip">
      <svg className="time-chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
      {label}
    </span>
  );
}
