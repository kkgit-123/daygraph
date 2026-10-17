import { forwardRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import { EmptyState } from '../ui/States';
import { useAskFlow, useUpdateTask } from '../../api/hooks';
import { clock, parseEstimate } from '../../lib/time';

/* Focus session timer. Runs only in this browser tab; nothing is sent to the server. */
function useFocusTimer() {
  const [session, setSession] = useState(null); // { taskId, startedAt, banked, running }
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!session?.running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session?.running]);
  const live = session?.running ? Math.max(0, Math.floor((now - session.startedAt) / 1000)) : 0;
  const elapsed = session ? session.banked + live : 0;
  const begin = (patch) => { const t = Date.now(); setNow(t); setSession((s) => ({ ...s, ...patch, startedAt: t, running: true })); };
  return {
    session, elapsed,
    start: (taskId) => begin({ taskId, banked: 0 }),
    pause: () => setSession((s) => ({ ...s, banked: s.banked + Math.floor((Date.now() - s.startedAt) / 1000), running: false })),
    resume: () => begin({}),
    stop: () => setSession(null),
  };
}

const FocusCard = forwardRef(function FocusCard({ day, highlight }, ref) {
  const update = useUpdateTask();
  const navigate = useNavigate();
  const run = useAskFlow();
  const timer = useFocusTimer();
  const pri = day.priorities || [];
  const task = pri.find((p) => p.state !== 'DONE');
  const active = timer.session && timer.session.taskId === task?.id;
  const est = parseEstimate(task?.estimateLabel);
  const pct = active && est ? Math.min(1, timer.elapsed / (est * 60)) : 0;

  const complete = () => {
    if (active) timer.stop();
    update.mutate({ id: task.id, patch: { state: 'DONE' } });
  };

  return (
    <section ref={ref} tabIndex={-1} aria-label="Up next"
      className={`relative rounded-[20px] border bg-surface shadow-card overflow-hidden stagger focus:outline-none transition-[box-shadow,border-color] duration-300 ${active ? 'glow-border border-transparent shadow-glow' : highlight ? 'border-ai/60 shadow-glow' : 'border-border'}`}
      style={{ '--i': 1 }}>
      {active && <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-quiet-tint"><div className="h-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-ai))] transition-[width] duration-1000 ease-linear" style={{ width: `${pct * 100}%` }} /></div>}
      {!task ? (
        <EmptyState icon="check" title="All priorities done">Nice work. Pick something from your task list, or replan the day.</EmptyState>
      ) : (
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[.08em] text-accent"><Icon name="target" size={14} sw={2.2} />{active ? 'In focus' : 'Up next'}</span>
            <Chip tone="ai"><Icon name="spark" size={12} sw={2} />Priority {task.slot || pri.indexOf(task) + 1}</Chip>
            <span className="flex-1" />
            {active && <span className={`inline-flex items-center gap-2 text-[13px] font-semibold ${timer.session.running ? 'text-accent' : 'text-muted'}`}>
              <span className={`w-2 h-2 rounded-full ${timer.session.running ? 'bg-accent pulse-ring' : 'bg-faint'}`} />{timer.session.running ? 'Focus session running' : 'Paused'}
            </span>}
          </div>

          <div className="flex flex-wrap items-start gap-5">
            <div className="flex-[1_1_320px] min-w-0">
              <h2 className="text-[21px] sm:text-[23px] leading-[1.25] font-semibold tracking-[-0.02em]">{task.title}</h2>
              {task.reason && <p className="mt-2 text-quiet-ink text-[14px] leading-[1.55]"><span className="font-semibold text-ink">Why it matters: </span>{task.reason}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {task.slotLabel && <Chip tone="accent"><Icon name="clock" size={12} sw={2.2} /><span className="tabular">{task.slotLabel}</span></Chip>}
                {task.estimateLabel && <Chip>{task.estimateLabel}</Chip>}
                {task.sourceLabel && <Chip>{task.sourceLabel}</Chip>}
              </div>
            </div>
            {active && (
              <div className="shrink-0 text-right" aria-live="off">
                <div className="text-[40px] leading-none font-semibold tracking-[-0.03em] tabular">{clock(timer.elapsed)}</div>
                {est && <div className="text-muted text-[12.5px] mt-1.5 tabular">of {task.estimateLabel} planned</div>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {!active && <Button onClick={() => timer.start(task.id)}><Icon name="play" size={14} sw={2.2} />Start focus session</Button>}
            {active && timer.session.running && <Button variant="secondary" onClick={timer.pause}><Icon name="pause" size={14} />Pause</Button>}
            {active && !timer.session.running && <Button onClick={timer.resume}><Icon name="play" size={14} sw={2.2} />Resume</Button>}
            {active && <Button variant="ghost" onClick={timer.stop}><Icon name="stop" size={14} />End session</Button>}
            <Button variant="secondary" disabled={update.isPending} onClick={complete}><Icon name="check" size={15} sw={2.4} />Mark complete</Button>
            <Button variant="ghost" onClick={() => { run(`What do I need to know about: ${task.title}?`); navigate('/ask'); }}>
              <Icon name="sparkles" size={15} className="text-ai" />Ask DayGraph
            </Button>
          </div>
        </div>
      )}
    </section>
  );
});

export default FocusCard;
