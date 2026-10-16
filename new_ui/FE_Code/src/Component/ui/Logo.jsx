import { useId } from 'react';

/*
  DayGraph mark: a sun rising over the horizon (the start of a day), a progress curve climbing
  through it (the day's graph), and a bright node where the curve lands (the AI orchestrating it).
*/
export function LogoMark({ size = 32, className = '' }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4C8DFF" /><stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path d="M8.5 21.5a7.5 7.5 0 0 1 15 0" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 24.5c5 0 6.5-9 11-9s4.6-5 8-6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="25" cy="9" r="3" fill="#fff" />
      <circle cx="17" cy="15.5" r="1.7" fill="#fff" />
    </svg>
  );
}

export default function Logo({ size = 30, wordmark = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {wordmark && <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Day<span className="text-accent">Graph</span></span>}
    </span>
  );
}
