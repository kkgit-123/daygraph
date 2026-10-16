import { useImpact } from '../../api/hooks';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';

export default function FocusChart({ day }) {
  const { data } = useImpact();
  const weekly = data?.weekly || [];
  if (!weekly.length) return null;
  const max = Math.max(...weekly.map((b) => b.meetingH + b.focusH), 1);
  const summary = weekly.map((b) => `${b.day}: ${b.focusH} h focus, ${b.meetingH} h meetings`).join('; ');
  return (
    <Panel className="p-5 sm:p-6 stagger" style={{ '--i': 4 }}>
      <PanelHeader icon={<Icon name="chart" size={16} />} title="Focus and meeting time" subtitle={`Hours per day this week. ${day.meetingLoad?.label || ''}`} />
      <div className="mt-5 flex items-end gap-3 h-[128px]" role="img" aria-label={`Focus and meeting hours this week. ${summary}`}>
        {weekly.map((b, i) => (
          <div key={b.day} className="group flex-1 flex flex-col items-center justify-end h-full gap-[3px]" title={`${b.focusH} h focus, ${b.meetingH} h meetings`}>
            <div className="w-full max-w-[34px] rounded-t-md bg-field-border origin-bottom animate-[grow_600ms_var(--ease-out)_both]" style={{ height: `${(b.meetingH / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
            <div className={`w-full max-w-[34px] rounded-b-md origin-bottom animate-[grow_600ms_var(--ease-out)_both] ${b.isToday ? 'bg-[linear-gradient(180deg,var(--color-ai),var(--color-accent))]' : 'bg-accent/80'}`}
              style={{ height: `${(b.focusH / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {weekly.map((b) => <div key={b.day} className={`flex-1 text-center text-[12px] ${b.isToday ? 'font-bold text-ink' : 'text-muted'}`}>{b.day}</div>)}
      </div>
      <div className="mt-4 pt-3 flex gap-4 text-[12.5px] text-muted flex-wrap border-t border-divider">
        <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px] bg-accent" />Focus</span>
        <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px] bg-field-border" />Meetings</span>
        <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px] bg-[linear-gradient(180deg,var(--color-ai),var(--color-accent))]" />Today</span>
      </div>
    </Panel>
  );
}
