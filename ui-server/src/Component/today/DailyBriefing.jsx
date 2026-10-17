import Button from '../ui/Button';
import Icon from '../ui/Icon';
import DayOrb from '../fx/DayOrb';
import { useReplan, useUndoReplan } from '../../api/hooks';
import { dayLabel } from '../../lib/dates';
import { durationLabel, partOfDay, toMin } from '../../lib/time';

/* Progress ring for the day: done / total across priorities and tasks */
function ProgressRing({ done, total }) {
  const pct = total ? done / total : 0;
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="relative w-[84px] h-[84px] shrink-0" role="img" aria-label={`${done} of ${total} tasks done today`}>
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-quiet-tint)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out)]" />
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--color-accent)" /><stop offset="1" stopColor="var(--color-ai)" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[19px] font-semibold tabular">{Math.round(pct * 100)}%</span>
        <span className="text-[10.5px] text-muted mt-1 tabular">{done}/{total}</span>
      </div>
    </div>
  );
}

export default function DailyBriefing({ day, me, date, onShift, onToday, onFocusNext }) {
  const replan = useReplan();
  const undo = useUndoReplan();
  const pri = day?.priorities || [];
  const tasks = day?.tasks || [];
  const all = [...pri, ...tasks];
  const done = all.filter((t) => t.state === 'DONE').length;
  const meetings = (day?.schedule || []).filter((s) => s.kind === 'meeting');
  const focusMin = (day?.schedule || []).filter((s) => s.kind === 'focus').reduce((a, s) => a + Math.max(0, toMin(s.end) - toMin(s.start)), 0);
  const next = pri.find((p) => p.state !== 'DONE');
  const openPri = pri.filter((p) => p.state !== 'DONE').length;
  const first = (me?.user?.name || '').split(' ')[0];
  const replanned = !!day?.plan?.replanned;
  const busy = replan.isPending || undo.isPending;
  const isToday = day?.isToday ?? date === me?.today;

  return (
    <section aria-label="Daily briefing" className="ambient spotlight relative overflow-hidden rounded-[20px] border border-border shadow-card stagger">
      <div aria-hidden="true" className="aurora"><span /><span /></div>
      {day && (
        <div className="hidden lg:block absolute right-0 inset-y-0 w-[42%] max-w-[480px]">
          <DayOrb className="absolute inset-[-8%] [mask-image:radial-gradient(closest-side,#000_72%,transparent)]" progress={all.length ? done / all.length : 0} energy={busy ? 4 : 1} />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 h-7 px-3 rounded-full bg-surface/80 backdrop-blur border border-border text-[12px] font-semibold whitespace-nowrap shadow-card">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" /><span className="tabular">{done}/{all.length}</span><span className="text-muted font-medium">done · nodes turn green as you finish</span>
          </div>
        </div>
      )}
      <div className="relative p-5 sm:p-7 lg:pr-[min(42%,480px)] flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent"><Icon name="sun" size={15} sw={2} />{day?.title || dayLabel(date)}</span>
          <span className="flex-1 lg:hidden" />
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface/70 p-0.5">
            <button type="button" aria-label="Previous day" onClick={() => onShift(-1)} className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center text-muted hover:text-ink hover:bg-quiet-tint"><Icon name="chevL" size={16} sw={2.2} /></button>
            <button type="button" onClick={onToday} disabled={isToday} className="h-8 px-2.5 rounded-[9px] text-[12.5px] font-semibold tabular text-ink disabled:cursor-default enabled:hover:bg-quiet-tint">{isToday ? 'Today' : dayLabel(date)}</button>
            <button type="button" aria-label="Next day" onClick={() => onShift(1)} className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center text-muted hover:text-ink hover:bg-quiet-tint"><Icon name="chevR" size={16} sw={2.2} /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex-[1_1_420px] min-w-0">
            <h1 className="text-[26px] sm:text-[32px] leading-[1.12] font-semibold tracking-[-0.03em]">
              {isToday ? <>Good Morning{first ? <>, <span className="text-shimmer">{first}</span></> : ''}.<span className="text-muted font-normal"> Let's make today count.</span></> : <>Your plan for {day?.shortLabel || dayLabel(date)}</>}
            </h1>
            {day && (
              <p className="mt-3 text-[15px] leading-[1.6] text-quiet-ink max-w-[680px]">
                <Icon name="sparkles" size={15} className="inline -mt-0.5 mr-1.5 text-ai" />
                You have <b className="text-ink">{openPri} {openPri === 1 ? 'priority' : 'priorities'}</b> open, <b className="text-ink">{meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}</b> and <b className="text-ink">{durationLabel(focusMin)}</b> of focus time planned.
                {next && <> Best next step: <b className="text-ink">{next.title.charAt(0).toLowerCase() + next.title.slice(1)}</b>{next.slotLabel ? <span className="tabular"> ({next.slotLabel})</span> : null}.</>}
                {!next && pri.length > 0 && <> All three priorities are done.</>}
              </p>
            )}
          </div>
          {day && <div className="relative md:mx-6 hidden sm:block lg:hidden"><ProgressRing done={done} total={all.length} /></div>}
          {day && (
            <div className="sm:hidden w-full" role="img" aria-label={`${done} of ${all.length} tasks done today`}>
              <div className="flex justify-between text-[12px] text-muted mb-1.5"><span>Today's progress</span><span className="tabular">{done}/{all.length}</span></div>
              <div className="h-1.5 rounded-full bg-quiet-tint overflow-hidden"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-ai))] transition-[width] duration-700" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} /></div>
            </div>
          )}
        </div>

        {day && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ai" size="lg" disabled={busy} loading={busy} className="w-full sm:w-auto"
              onClick={() => (replanned ? undo.mutate() : replan.mutate(day.date))}>
              <Icon name={replanned ? 'refresh' : 'sparkles'} size={17} sw={2} />{replanned ? 'Undo replan' : 'Replan my day'}
            </Button>
            {next && <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onFocusNext}><Icon name="target" size={17} />What should I focus on next?</Button>}
            {day.meetingLoad?.label && <span className="text-muted text-[13px] inline-flex items-center gap-1.5 ml-1"><Icon name="clock" size={14} />{day.meetingLoad.label}</span>}
          </div>
        )}
      </div>
    </section>
  );
}
