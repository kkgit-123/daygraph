const tones = {
  ok: 'bg-ok-tint text-ok-ink',
  conflict: 'bg-conflict-tint text-conflict-ink',
  warn: 'bg-warn-tint text-warn-ink',
  ai: 'bg-accent-tint text-accent-ink',
  aiwhite: 'bg-white text-accent-ink',
  quiet: 'bg-quiet-tint text-quiet-ink',
  pick: 'bg-white border border-field-border text-ink hover:bg-ground',
  picked: 'bg-accent border border-accent text-white',
};
const sizes = {
  md: 'h-[26px] px-2.5',
  f: 'h-[30px] px-2.5',
  g: 'h-8 px-3.5',
  s: 'h-[34px] px-3.5 text-[13.5px]',
};

export default function Chip({ tone = 'quiet', size = 'md', className = '', onClick, children, ...p }) {
  const cls = `inline-flex items-center gap-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap ${sizes[size]} ${tones[tone]} ${className}`;
  if (onClick) return <button type="button" onClick={onClick} className={cls} {...p}>{children}</button>;
  return <span className={cls} {...p}>{children}</span>;
}
