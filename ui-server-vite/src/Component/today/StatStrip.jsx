import { useImpact } from '../../api/hooks';
import Panel from '../ui/Panel';
import { ErrorBox, Skeleton } from '../ui/States';

function Spark({ series = [], color }) {
  if (series.length < 2) return null;
  const min = Math.min(...series), max = Math.max(...series);
  const pts = series.map((v, i) => [2 + (92 * i) / (series.length - 1), 26 - ((v - min) / (max - min || 1)) * 20]);
  const last = pts[pts.length - 1];
  return (
    <svg width="96" height="32" viewBox="0 0 96 32" fill="none" aria-hidden="true">
      <polyline points={pts.map((p) => `${p[0].toFixed(0)},${p[1].toFixed(0)}`).join(' ')} stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

const NOTE = { conflict: 'text-conflict-ink', ok: 'text-ok-ink', quiet: 'text-ok-ink' };

export default function StatStrip() {
  const { data, isLoading, error, refetch } = useImpact();
  if (isLoading) return <Skeleton className="h-[130px]" />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  const stats = data?.stats || [];
  return (
    <Panel className="flex flex-wrap overflow-hidden">
      {stats.map((s) => (
        <div key={s.key} className="flex-[1_1_220px] px-[26px] pt-[22px] pb-5 flex flex-col gap-2.5 border-r border-divider last:border-r-0">
          <div className="text-muted text-[13.5px]">{s.label}</div>
          <div className="flex items-end justify-between gap-3">
            <div className="text-[32px] leading-none font-bold tracking-[-0.02em]">{s.value}</div>
            <Spark series={s.series} color={s.tone === 'conflict' ? '#C23B22' : '#3540D3'} />
          </div>
          <div className={`text-[13px] font-semibold ${NOTE[s.tone] || 'text-ok-ink'}`}>{s.note || (s.percent != null ? `${s.percent}% on time` : '')}</div>
        </div>
      ))}
    </Panel>
  );
}
