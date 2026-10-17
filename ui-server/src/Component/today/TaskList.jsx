import { useState } from 'react';
import Check from '../ui/Check';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';
import { EmptyState } from '../ui/States';
import { useCreateTask, useUpdateTask } from '../../api/hooks';

const FILTERS = [['all', 'All'], ['open', 'Open'], ['done', 'Done']];

export default function TaskList({ day }) {
  const update = useUpdateTask();
  const create = useCreateTask();
  const [filter, setFilter] = useState('all');
  const tasks = day.tasks || [];
  const done = tasks.filter((t) => t.state === 'DONE').length;
  const shown = tasks.filter((t) => filter === 'all' || (filter === 'done') === (t.state === 'DONE'));

  const add = (e) => {
    if (e.key !== 'Enter') return;
    const title = e.target.value.trim();
    if (!title) return;
    create.mutate({ title, planDate: day.date });
    e.target.value = '';
  };

  return (
    <Panel className="p-5 sm:p-6 stagger" style={{ '--i': 3 }}>
      <PanelHeader icon={<Icon name="list" size={16} />} title="Also today" subtitle={`${done} of ${tasks.length} done`}>
        <div role="tablist" aria-label="Filter tasks" className="flex gap-0.5 p-0.5 rounded-[10px] bg-surface-2 border border-border">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`h-7 px-2.5 rounded-lg text-[12.5px] font-semibold transition-colors ${filter === k ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
      </PanelHeader>

      <div className="mt-4 flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-dashed border-field-border focus-within:border-accent focus-within:border-solid transition-colors">
        <Icon name="plus" size={16} sw={2.2} className="text-accent" />
        <input id="addTaskInput" placeholder="Add a task and press Enter" aria-label="Add a task" onKeyDown={add}
          className="flex-1 bg-transparent outline-none placeholder:text-faint focus-visible:outline-none" />
        {create.isPending && <span className="w-3.5 h-3.5 rounded-full border-2 border-accent border-r-transparent animate-spin" aria-label="Adding" />}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={filter === 'done' ? 'check' : 'list'} title={filter === 'done' ? 'Nothing done yet' : 'No open tasks'}>
          {filter === 'done' ? 'Completed tasks show up here.' : 'Everything on today’s list is done.'}
        </EmptyState>
      ) : (
        <ul className="mt-2">
          {shown.map((t) => {
            const on = t.state === 'DONE';
            return (
              <li key={t.id} className="flex gap-3.5 py-3 items-center border-b border-divider last:border-b-0">
                <Check on={on} size={22} aria-label={`${on ? 'Mark as not done' : 'Mark as done'}: ${t.title}`}
                  onClick={() => update.mutate({ id: t.id, patch: { state: on ? 'OPEN' : 'DONE' } })} />
                <div className={`flex-1 min-w-0 text-[14px] transition-colors ${on ? 'line-through text-faint' : ''}`}>{t.title}</div>
                {t.carriedOver && !on && <Chip tone="warn" className="hidden sm:inline-flex"><Icon name="refresh" size={11} />{t.carriedLabel || 'Carried over'}</Chip>}
                {t.estimateLabel && <span className="text-[12px] text-muted tabular shrink-0">{t.estimateLabel}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
