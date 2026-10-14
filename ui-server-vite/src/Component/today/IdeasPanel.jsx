import { useState } from 'react';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Field from '../ui/Field';
import Panel from '../ui/Panel';
import { ErrorBox, Skeleton } from '../ui/States';
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
    <Panel className="p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-[19px] font-bold">Ideas</h2>
        <p className="text-muted mt-1 text-[13.5px]">Only you can see these. Ask finds them later.</p>
      </div>
      <div className="flex gap-2.5">
        <Field value={text} onChange={(e) => setText(e.target.value)} placeholder="Capture an idea and press Enter" aria-label="New idea"
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
        <Button variant="secondary" disabled={!text.trim() || create.isPending} onClick={save}>Save</Button>
      </div>
      {error ? <ErrorBox error={error} onRetry={refetch} />
        : isLoading ? <Skeleton className="h-16" />
          : ideas.length === 0 ? <p className="text-muted text-[13.5px]">No ideas yet.</p>
            : (
              <ul className="flex flex-col">
                {ideas.map((idea) => (
                  <li key={idea.id} className="flex flex-wrap gap-3 items-center py-3 border-t border-divider">
                    <div className="flex-[1_1_220px] min-w-0">
                      <div className="font-semibold leading-[1.4]">{idea.text}</div>
                      <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                        {(idea.tags || []).map((t) => <Chip key={t} tone="ai">{t}</Chip>)}
                        <span className="text-muted text-[12.5px]">{shortDate(idea.createdAt)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" disabled={toTask.isPending} onClick={() => toTask.mutate(idea.id)}>Make a task</Button>
                  </li>
                ))}
              </ul>
            )}
    </Panel>
  );
}
