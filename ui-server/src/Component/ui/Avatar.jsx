import { colorsFor } from '../../lib/people';

const sizes = { 28: 'w-7 h-7 text-[11px]', 30: 'w-[30px] h-[30px] text-xs', 38: 'w-[38px] h-[38px] text-sm' };

export default function Avatar({ initials, bg, color, size = 30, className = '' }) {
  const c = colorsFor(initials, bg, color);
  return (
    <span style={{ background: c.bg, color: c.color }}
      className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 ${sizes[size]} ${className}`}>
      {initials}
    </span>
  );
}
