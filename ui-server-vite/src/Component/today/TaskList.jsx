import { useRef } from 'react';
import Check from '../ui/Check';
import Chip from '../ui/Chip';
import Field from '../ui/Field';
import Panel from '../ui/Panel';
import { useCreateTask, useUpdateTask } from '../../api/hooks';

export default function TaskList({ day }) {
  const update = useUpdateTask();
  const create = useCreateTask();
  const input = useRef(null);
  const tasks = day.tasks || [];
  const done = tasks.filter((t) => t.state === 'DONE').length;

  const add = (e) => {
    if (e.key !== 'Enter') return;
    const title = e.target.value.trim();
    if (!title) return;
    create.mutate({ title, planDate: day.date });
    e.target.value = '';
  };

  return (
    <Panel className="pt-[26px] px-7 pb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-[19px] font-bold">Also today</h2>
        <span className="flex-1" />
        <span className="text-muted text-[13.5px]">{done} of {tasks.length} done</span>
      </div>
      <div className="mt-2.5">
        {tasks.map((t) => {
          const on = t.state === 'DONE';
          return (
            <div key={t.id} className="flex gap-4 py-3.5 items-center border-t border-divider">
              <Check on={on} aria-label={`${on ? 'Mark as not done' : 'Mark as done'}: ${t.title}`}
                onClick={() => update.mutate({ id: t.id, patch: { state: on ? 'OPEN' : 'DONE' } })} />
              <div className={`flex-1 min-w-0 ${on ? 'line-through text-[#7A809A]' : ''}`}>{t.title}</div>
              {t.carriedOver && <Chip tone="warn">{t.carriedLabel || 'Carried over'}</Chip>}
              {t.estimateLabel && <Chip>{t.estimateLabel}</Chip>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 pt-[18px] mt-1 border-t border-divider">
        <Field id="addTaskInput" ref={input} placeholder="Add a task and press Enter" aria-label="Add a task" onKeyDown={add} />
      </div>
    </Panel>
  );
}
