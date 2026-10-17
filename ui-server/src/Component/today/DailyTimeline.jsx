import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';
import { durationLabel, toHHMM, toMin } from '../../lib/time';

const KIND = {
  meeting: { icon: 'video', label: 'Meeting', dot: 'bg-accent', card: 'border-border bg-surface', ink: 'text-ink' },
  focus: { icon: 'target', label: 'Focus block', dot: 'bg-ai', card: 'border-ai/25 bg-ai-tint', ink: 'text-ai-ink' },
  break: { icon: 'coffee', label: 'Break', dot: 'bg-warn', card: 'border-dashed border-field-border bg-transparent', ink: 'text-muted' },
  free: { icon: 'sparkles', label: 'Open window', dot: 'bg-ok', card: 'border-dashed border-ok/40 bg-transparent', ink: 'text-ok-ink' },
};

/* Merges the day's schedule with lunch (from settings) and the open windows between them. */
function buildTimeline(schedule, settings) {
  const items = schedule.map((s) => ({ ...s, s: toMin(s.start), e: toMin(s.end) })).filter((s) => s.s != null);
  const ls = toMin(settings?.lunchStart), le = toMin(settings?.lunchEnd);
  if (ls != null && le != null && !items.some((i) => i.s < le && i.e > ls)) {
    items.push({ kind: 'break', id: 'lunch', title: 'Lunch', start: settings.lunchStart, end: settings.lunchEnd, s: ls, e: le });
  }
  items.sort((a, b) => a.s - b.s);
  const ws = toMin(settings?.workStart), we = toMin(settings?.workEnd);
  const out = [];
  let cursor = ws ?? items[0]?.s ?? 0;
  items.forEach((it) => {
    if (it.s - cursor >= 30) out.push({ kind: 'free', id: `free-${cursor}`, title: `${durationLabel(it.s - cursor)} free`, start: toHHMM(cursor), end: toHHMM(it.s), s: cursor, e: it.s });
    out.push(it);
    cursor = Math.max(cursor, it.e);
  });
  if (we != null && we - cursor >= 30) out.push({ kind: 'free', id: `free-${cursor}`, title: `${durationLabel(we - cursor)} free`, start: toHHMM(cursor), end: toHHMM(we), s: cursor, e: we });
  return out;
}

function Detail({ it }) {
  const navigate = useNavigate();
  const mins = it.e - it.s;
  if (it.kind === 'meeting') {
    const n = it.pendingDecisions || 0;
    return (
      <div className="mt-2.5 pt-2.5 border-t border-divider flex flex-col gap-2 text-[13px] text-muted">
        <span>{durationLabel(mins)} · {it.state === 'ended' ? 'Transcript analysed by DayGraph' : 'Decisions are extracted after it ends'}</span>
        <div className="flex flex-wrap gap-2">
          <Chip tone="pick" onClick={() => navigate('/meetings')}><Icon name="video" size={12} />Open meetings</Chip>
          {n > 0 && <Chip tone="pick" onClick={() => navigate('/review')}><Icon name="inbox" size={12} />Review decisions</Chip>}
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2.5 pt-2.5 border-t border-divider text-[13px] text-muted">
      {it.kind === 'focus' && <>{durationLabel(mins)} of protected time.{it.reason ? ` Placed here: ${it.reason}.` : ''}</>}
      {it.kind === 'break' && <>From your working-hours settings. Focus blocks are never placed here.</>}
      {it.kind === 'free' && <>Nothing is scheduled. Replan the day to use it, or keep it as buffer.</>}
    </div>
  );
}

export default function DailyTimeline({ day, settings }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);
  const items = buildTimeline(day.schedule || [], settings);
  const focusMin = items.filter((i) => i.kind === 'focus').reduce((a, i) => a + i.e - i.s, 0);
  const freeMin = items.filter((i) => i.kind === 'free').reduce((a, i) => a + i.e - i.s, 0);

  return (
    <Panel className="p-5 sm:p-6 flex flex-col gap-4 stagger" style={{ '--i': 2 }}>
      <PanelHeader icon={<Icon name="cal" size={16} />} title="Today's timeline" subtitle="Focus blocks are placed around your meetings." />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted">
        {['meeting', 'focus', 'break', 'free'].map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${KIND[k].dot}`} />{KIND[k].label}</span>)}
      </div>
      <ol className="relative flex flex-col gap-2" aria-label="Schedule">
        <span aria-hidden="true" className="absolute left-[55px] top-3 bottom-3 w-px bg-divider" />
        {items.map((it) => {
          const k = KIND[it.kind] || KIND.meeting;
          const ended = it.kind === 'meeting' && it.state === 'ended';
          const n = it.pendingDecisions || 0;
          const isOpen = open === `${it.kind}-${it.id}`;
          const compact = it.kind === 'free' || it.kind === 'break';
          return (
            <li key={`${it.kind}-${it.id}`} className="relative flex gap-3 items-stretch">
              <div className={`w-[44px] shrink-0 text-right text-[12.5px] tabular pt-2.5 ${ended ? 'text-faint' : 'text-muted'}`}>{it.start}</div>
              <span aria-hidden="true" className={`relative z-[1] mt-3.5 w-[9px] h-[9px] rounded-full ring-4 ring-surface shrink-0 ${ended ? 'bg-faint' : k.dot}`} />
              <div className={`flex-1 min-w-0 rounded-xl border ${k.card} ${ended ? 'opacity-70' : ''} transition-colors`}>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : `${it.kind}-${it.id}`)}
                  className={`w-full text-left ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} rounded-xl hover:bg-quiet-tint/60`}>
                  <div className={`flex items-center gap-2 font-semibold text-[13.5px] ${k.ink}`}>
                    <Icon name={k.icon} size={14} sw={2} />
                    <span className="flex-1 truncate">{it.title}</span>
                    <Icon name="chevD" size={14} className={`text-faint transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {!compact && <div className="text-muted text-[12.5px] mt-0.5 tabular">{ended ? `Ended ${it.end}` : `${it.start} – ${it.end}`}{it.kind === 'focus' && it.reason ? ` · ${it.reason.replace(/^[\d:]+ to [\d:]+,?\s*/, '')}` : ''}</div>}
                </button>
                {isOpen && <div className={`${compact ? 'px-3 pb-2' : 'px-3.5 pb-2.5'} -mt-1 animate-fade`}><Detail it={it} /></div>}
                {(ended && n > 0) || it.movedByReplan ? (
                  <div className="px-3.5 pb-2.5 -mt-0.5 flex flex-wrap gap-2">
                    {ended && n > 0 && <Chip tone="warn" onClick={() => navigate('/review')}><Icon name="inbox" size={12} />{n} {n === 1 ? 'decision' : 'decisions'} to review</Chip>}
                    {it.movedByReplan && <Chip tone="aiwhite"><Icon name="refresh" size={12} />Moved by replan</Chip>}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-xl bg-ai-tint px-3.5 py-2.5"><div className="text-[11.5px] font-semibold text-ai-ink uppercase tracking-[.06em]">Focus</div><div className="text-[17px] font-semibold tabular">{durationLabel(focusMin)}</div></div>
        <div className="rounded-xl bg-ok-tint px-3.5 py-2.5"><div className="text-[11.5px] font-semibold text-ok-ink uppercase tracking-[.06em]">Open</div><div className="text-[17px] font-semibold tabular">{durationLabel(freeMin)}</div></div>
      </div>
    </Panel>
  );
}
