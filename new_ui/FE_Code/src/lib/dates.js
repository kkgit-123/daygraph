/* Timezone-aware date and time helpers (DG-F07). Default zone is Asia/Tokyo, as in the prototype. */
export const APP_TZ = import.meta.env.VITE_APP_TZ || 'Asia/Tokyo';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/* Accepts ISO strings with any offset ("2026-10-03T09:30:00+09:00"), Z, or a bare date ("2026-10-03"). */
export function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && DATE_ONLY.test(value)) return new Date(`${value}T00:00:00Z`);
  return new Date(value);
}

const isValid = (d) => !Number.isNaN(d.getTime());

/* "09:30" in the app timezone */
export function formatTime(value) {
  const d = toDate(value);
  if (!isValid(d)) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: APP_TZ }).format(d);
}

/* "3 Oct" */
export function shortDate(value) {
  const d = toDate(value);
  if (!isValid(d)) return '';
  const dateOnly = typeof value === 'string' && DATE_ONLY.test(value);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: dateOnly ? 'UTC' : APP_TZ }).format(d);
}

/* "Mon 12 Oct" */
export function dayLabel(value) {
  const d = toDate(value);
  if (!isValid(d)) return '';
  const dateOnly = typeof value === 'string' && DATE_ONLY.test(value);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: dateOnly ? 'UTC' : APP_TZ }).format(d);
}

/* Moves a YYYY-MM-DD string by whole days without any timezone shift. */
export function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* "Just now", "12 min ago", "3 h ago", "Yesterday", "4 days ago", otherwise the short date. */
export function relativeLabel(value, now = Date.now()) {
  const d = toDate(value);
  if (!isValid(d)) return '';
  const mins = Math.round((now - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(value);
}
