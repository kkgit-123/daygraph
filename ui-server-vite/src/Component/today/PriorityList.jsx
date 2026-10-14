import Button from '../ui/Button';
import Check from '../ui/Check';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel from '../ui/Panel';
import { useReplan, useUndoReplan, useUpdateTask } from '../../api/hooks';

export default function PriorityList({ day }) {
  const update = useUpdateTask();
  const replan = useReplan();
  const undo = useUndoReplan();
  const items = day.priorities || [];
  const done = items.filter((p) => p.state === 'DONE').length;
  const replanned = !!day.plan?.replanned;
  const busy = replan.isPending || undo.isPending;

  return (
    <Panel className="pt-[26px] px-7 pb-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-[19px] font-bold">Top 3 priorities</h2>
        <Chip tone="ai"><Icon name="spark" size={14} sw={2} />Ordered by DayGraph</Chip>
        <span className="flex-1" />
        <span className="text-muted text-[13.5px]">{done} of {items.length || 3} done</span>
        <Button variant="secondary" size="sm" disabled={busy}
          onClick={() => (replanned ? undo.mutate() : replan.mutate(day.date))}>
          <Icon name="refresh" size={16} sw={2} />{replanned ? 'Undo replan' : 'Replan day'}
        </Button>
      </div>
      <div className="mt-3.5">
        {items.map((p) => {
          const on = p.state === 'DONE';
          return (
            <div key={p.id} className="flex gap-4 py-5 items-start border-t border-divider">
              <Check on={on} aria-label={`${on ? 'Mark as not done' : 'Mark as done'}: ${p.title}`}
                onClick={() => update.mutate({ id: p.id, patch: { state: on ? 'OPEN' : 'DONE' } })} />
              <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                <div className={`text-[17px] font-semibold leading-[1.35] ${on ? 'line-through text-[#7A809A]' : ''}`}>{p.title}</div>
                <div className="flex flex-wrap gap-2">
                  {p.slotLabel && <Chip tone="ai"><Icon name="clock" size={14} sw={2} />{p.slotLabel}</Chip>}
                  {p.estimateLabel && <Chip>{p.estimateLabel}</Chip>}
                  {p.sourceLabel && <Chip>{p.sourceLabel}</Chip>}
                </div>
                {p.reason && <div className="text-muted text-[13.5px] leading-normal">{p.reason}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
