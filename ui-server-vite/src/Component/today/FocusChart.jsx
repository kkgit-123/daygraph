import { useImpact } from '../../api/hooks';
import Panel from '../ui/Panel';

export default function FocusChart({ day }) {
  const { data } = useImpact();
  const weekly = data?.weekly || [];
  if (!weekly.length) return null;
  return (
    <Panel className="p-6">
      <h2 className="text-[19px] font-bold">Focus and meeting time</h2>
      <p className="text-muted mt-1 text-[13.5px]">Hours per day this week. {day.meetingLoad?.label}</p>
      <div className="mt-[18px] flex items-end gap-3.5 h-[132px]">
        {weekly.map((b) => (
          <div key={b.day} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full">
            <div className="w-full rounded-t-md bg-field-border" style={{ height: b.meetingH * 20 }} />
            <div className={`w-full rounded-b-md ${b.isToday ? 'bg-[repeating-linear-gradient(135deg,#3540D3_0_6px,#5C66E0_6px_12px)]' : 'bg-accent'}`} style={{ height: b.focusH * 20 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3.5">
        {weekly.map((b) => (
          <div key={b.day} className={`flex-1 text-center text-[13px] ${b.isToday ? 'font-bold text-ink' : 'text-muted'}`}>{b.day}</div>
        ))}
      </div>
      <div className="mt-4 pt-3.5 flex gap-[18px] text-[13px] flex-wrap border-t border-divider">
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-[3px] bg-accent" />Focus</span>
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-[3px] bg-field-border" />Meetings</span>
      </div>
    </Panel>
  );
}
