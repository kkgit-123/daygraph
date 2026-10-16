import { useState } from 'react';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Field from '../ui/Field';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';
import { EmptyState, ErrorBox, Skeleton } from '../ui/States';
import { shortDate } from '../../lib/dates';
import { useCreateIdea, useIdeas, useIdeaToTask } from '../../api/hooks';

export default function IdeasPanel() {
  const { data: ideas = [], isLoading, error, refetch } = useIdeas();
  const create = useCreateIdea();
  const toTask = useIdeaToTask();
  const [text, setText] = useState('');

  const save = () => {
    const value = text.trim();
    if (!value) return;
    create.mutate(value, { onSuccess: () => setText('') });
  };

  return (
    <Panel className="p-5 sm:p-6 flex flex-col gap-4 stagger" style={{ '--i': 5 }}>
      <PanelHeader icon={<Icon name="bulb" size={16} />} iconTone="warn" title="Ideas" subtitle="Only you can see these. Ask finds them later." />
      <div className="flex gap-2.5">
        <Field size="sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Capture an idea and press Enter" aria-label="New idea"
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
        <Button variant="secondary" disabled={!text.trim()} loading={create.isPending} onClick={save}>Save</Button>
      </div>
      {error ? <ErrorBox error={error} onRetry={refetch} />
        : isLoading ? <Skeleton className="h-16" />
          : ideas.length === 0 ? <EmptyState icon="bulb" title="No ideas yet">Capture one above. It stays private to you.</EmptyState>
            : (
              <ul className="flex flex-col">
                {ideas.map((idea) => (
                  <li key={idea.id} className="flex flex-wrap gap-3 items-center py-3 border-t border-divider">
                    <div className="flex-[1_1_220px] min-w-0">
                      <div className="font-medium leading-[1.45]">{idea.text}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        {(idea.tags || []).map((t) => <Chip key={t} tone="ai">{t}</Chip>)}
                        <span className="text-faint text-[12px]">{shortDate(idea.createdAt)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" disabled={toTask.isPending} onClick={() => toTask.mutate(idea.id)}><Icon name="plus" size={14} />Make a task</Button>
                  </li>
                ))}
              </ul>
            )}
    </Panel>
  );
}
