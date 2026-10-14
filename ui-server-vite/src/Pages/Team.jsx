import { useNavigate } from 'react-router-dom';
import PageHeader from '../Component/layout/PageHeader';
import Avatar from '../Component/ui/Avatar';
import Button from '../Component/ui/Button';
import Chip from '../Component/ui/Chip';
import Icon from '../Component/ui/Icon';
import Panel from '../Component/ui/Panel';
import { ErrorBox, Skeleton } from '../Component/ui/States';
import { useTeam } from '../api/hooks';

const TONE_NOTE = { conflict: 'text-conflict-ink', ok: 'text-ok-ink' };

export default function Team() {
  const { data, isLoading, error, refetch } = useTeam();
  const navigate = useNavigate();

  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isLoading || !data) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader title="Team" subtitle={`Payments launch · ${data.weekLabel}`}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/graph')}>Open decision graph</Button>
      </PageHeader>

      <Panel className="flex flex-wrap overflow-hidden">
        {data.stats.map((s) => (
          <div key={s.key} className="flex-[1_1_220px] px-[26px] pt-[22px] pb-5 flex flex-col gap-2.5 border-r border-divider last:border-r-0">
            <div className="text-muted text-[13.5px]">{s.label}</div>
            <div className="text-[32px] leading-none font-bold tracking-[-0.02em]">{s.value}</div>
            <div className={`text-[13px] font-semibold ${TONE_NOTE[s.tone] || 'text-ok-ink'}`}>{s.note}</div>
          </div>
        ))}
      </Panel>

      <div className="flex flex-wrap gap-6 items-start">
        <Panel className="flex-[999_1_520px] min-w-0 p-6 flex flex-col gap-4">
          <h2 className="text-[19px] font-bold">People this week</h2>
          <ul className="flex flex-col">
            {data.members.map((m) => {
              const total = m.done + m.open;
              const pct = total ? Math.round((m.done / total) * 100) : 0;
              return (
                <li key={m.personId} className="flex flex-wrap gap-4 items-center py-4 border-t border-divider first:border-t-0">
                  <Avatar initials={m.initials} bg={m.bg} color={m.color} size={38} />
                  <div className="flex-[1_1_220px] min-w-0">
                    <div className="font-semibold">{m.name} <span className="text-muted font-normal">· {m.role}</span></div>
                    <div className="text-muted text-[13.5px] mt-0.5">{m.focus}</div>
                  </div>
                  <div className="w-[160px]">
                    <div className="h-2 rounded-full bg-quiet-tint overflow-hidden" aria-hidden="true">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-muted text-[12.5px] mt-1">{m.done} done, {m.open} open</div>
                  </div>
                  {m.status === 'waiting' ? <Chip tone="warn">Waiting on you</Chip> : <Chip tone="ok">On track</Chip>}
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="flex-[1_1_300px] max-w-[420px] min-w-0 flex flex-col gap-6">
          <Panel className="p-6 flex flex-col gap-3.5">
            <h2 className="text-[17px] font-bold flex items-center gap-2"><Icon name="spark" size={18} sw={2} color="#3540D3" />Weekly brief</h2>
            <p className="leading-[1.6]">{data.brief}</p>
          </Panel>
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[17px] font-bold">Waiting on you</h2>
            {data.waiting.map((w) => (
              <button key={w.personId} type="button" onClick={() => navigate(w.to)}
                className="flex items-start gap-2.5 p-3 rounded-[10px] bg-warn-tint text-warn-ink">
                <span><span className="font-semibold">{w.name}</span> {w.text}</span>
              </button>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}
