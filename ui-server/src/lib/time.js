/* Clock-string helpers for the day timeline ("09:30" <-> minutes since midnight). */
import { APP_TZ } from './dates';

export const toMin = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/* "1 h 30 min", "45 min" */
export const durationLabel = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/* "90 min" / "1 h" / "1 h 30 min" -> minutes */
export const parseEstimate = (label = '') => {
  const h = /(\d+)\s*h/.exec(label), m = /(\d+)\s*min/.exec(label);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0) || null;
};

/* "morning" | "afternoon" | "evening" in the app timezone */
export const partOfDay = (now = new Date()) => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: APP_TZ }).format(now));
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
};

/* "04:05" from seconds */
export const clock = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
