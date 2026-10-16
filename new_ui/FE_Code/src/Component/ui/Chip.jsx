const tones = {
  ok: 'bg-ok-tint text-ok-ink',
  conflict: 'bg-conflict-tint text-conflict-ink',
  warn: 'bg-warn-tint text-warn-ink',
  ai: 'bg-ai-tint text-ai-ink',
  aiwhite: 'bg-surface text-ai-ink border border-ai/30',
  accent: 'bg-accent-tint text-accent-ink',
  quiet: 'bg-quiet-tint text-quiet-ink',
  pick: 'bg-surface border border-field-border text-ink hover:bg-surface-2',
  picked: 'bg-accent border border-accent text-on-accent',
};
const sizes = {
  md: 'h-6 px-2.5',
  f: 'h-[30px] px-3',
  g: 'h-8 px-3.5',
  s: 'h-[34px] px-3.5 text-[13px]',
};

export default function Chip({ tone = 'quiet', size = 'md', className = '', onClick, children, ...p }) {
  const cls = `inline-flex items-center gap-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors duration-150 ${sizes[size]} ${tones[tone]} ${className}`;
  if (onClick) return <button type="button" onClick={onClick} className={cls} {...p}>{children}</button>;
  return <span className={cls} {...p}>{children}</span>;
}
