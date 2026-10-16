import Check from '../ui/Check';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';
import { useUpdateTask } from '../../api/hooks';

export default function PriorityList({ day }) {
  const update = useUpdateTask();
  const items = day.priorities || [];
  const done = items.filter((p) => p.state === 'DONE').length;

  return (
    <Panel className="p-5 sm:p-6 stagger" style={{ '--i': 2 }}>
      <PanelHeader icon={<Icon name="sparkles" size={16} />} iconTone="ai" title="Top 3 priorities" subtitle="Ordered by DayGraph from deadlines, blockers and your free time.">
        <span className="text-muted text-[13px] tabular">{done} of {items.length || 3} done</span>
      </PanelHeader>
      <ol className="mt-4 flex flex-col gap-2">
        {items.map((p, i) => {
          const on = p.state === 'DONE';
          return (
            <li key={p.id} className={`group flex gap-3.5 p-3.5 rounded-xl border transition-colors duration-200 ${on ? 'border-transparent bg-quiet-tint/50' : 'border-border hover:border-field-border'}`}>
              <div className="flex flex-col items-center gap-2 pt-0.5">
                <Check on={on} aria-label={`${on ? 'Mark as not done' : 'Mark as done'}: ${p.title}`}
                  onClick={() => update.mutate({ id: p.id, patch: { state: on ? 'OPEN' : 'DONE' } })} />
                <span className="text-[11px] font-bold text-faint tabular" aria-hidden="true">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className={`text-[15.5px] font-semibold leading-[1.35] transition-colors ${on ? 'line-through text-faint' : ''}`}>{p.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  {on ? <Chip tone="ok"><Icon name="check" size={12} sw={2.6} />Completed</Chip>
                    : p.slotLabel && <Chip tone="accent"><Icon name="clock" size={12} sw={2.2} /><span className="tabular">{p.slotLabel}</span></Chip>}
                  {p.estimateLabel && <Chip>{p.estimateLabel}</Chip>}
                  {p.sourceLabel && <Chip>{p.sourceLabel}</Chip>}
                </div>
                {p.reason && !on && <div className="text-muted text-[13px] leading-normal">{p.reason}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
