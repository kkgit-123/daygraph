import CountUp from '../fx/CountUp';
import { useImpact } from '../../api/hooks';
import { ErrorBox, Skeleton } from '../ui/States';

function Spark({ series = [], tone }) {
  if (series.length < 2) return null;
  const min = Math.min(...series), max = Math.max(...series);
  const pts = series.map((v, i) => [2 + (92 * i) / (series.length - 1), 26 - ((v - min) / (max - min || 1)) * 20]);
  const last = pts[pts.length - 1];
  const color = tone === 'conflict' ? 'var(--color-conflict)' : 'var(--color-accent)';
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width="96" height="32" viewBox="0 0 96 32" fill="none" aria-hidden="true" className="overflow-visible">
      <polygon points={`2,30 ${line} 94,30`} style={{ fill: color, opacity: 0.1 }} />
      <polyline points={line} style={{ stroke: color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1"
        strokeDasharray="1" className="animate-[draw_900ms_var(--ease-out)_both]" />
      <circle cx={last[0]} cy={last[1]} r="3" style={{ fill: color }} />
    </svg>
  );
}

const NOTE = { conflict: 'text-conflict-ink', ok: 'text-ok-ink', quiet: 'text-ok-ink' };

/* Impact numbers from /impact. Shared tile layout is also used by Team, Manager and Admin. */
export function StatTiles({ stats, render }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      {stats.map((s, i) => (
        <div key={s.key || s.label} className="spotlight stagger lift rounded-2xl bg-surface border border-border shadow-card px-4 sm:px-5 py-4 flex flex-col gap-2 min-w-0" style={{ '--i': i }}>
          {render(s)}
        </div>
      ))}
    </div>
  );
}

export default function StatStrip() {
  const { data, isLoading, error, refetch } = useImpact();
  if (isLoading) return <Skeleton className="h-[118px]" />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  return (
    <StatTiles stats={data?.stats || []} render={(s) => (
      <>
        <div className="text-muted text-[12.5px] sm:text-[13px] leading-snug">{s.label}</div>
        <div className="flex items-end justify-between gap-3">
          <div className="text-[28px] leading-none font-semibold tracking-[-0.03em] tabular"><CountUp value={s.value} /></div>
          <span className="hidden sm:block"><Spark series={s.series} tone={s.tone} /></span>
        </div>
        <div className={`text-[12.5px] font-semibold ${NOTE[s.tone] || 'text-ok-ink'}`}>{s.note || (s.percent != null ? `${s.percent}% on time` : '')}</div>
      </>
    )} />
  );
}
