import { useState } from 'react';
import Chip from '../ui/Chip';
import Panel from '../ui/Panel';
import { ErrorBox, Skeleton } from '../ui/States';
import { useNote, useSaveNote } from '../../api/hooks';

const SCOPES = [['day', 'This day'], ['global', 'Everywhere']];

const STATUS_TEXT = { pending: 'Saving…', saved: 'Saved just now' };

function Editor({ scope, date, initial }) {
  const { save, status } = useSaveNote(scope, date);
  const [text, setText] = useState(initial);
  const onChange = (e) => {
    setText(e.target.value);
    save(e.target.value);
  };
  return (
    <>
      <textarea value={text} onChange={onChange} aria-label="Scratchpad" placeholder="Jot down anything you do not want to lose."
        className="w-full min-h-[120px] resize-y bg-transparent border-0 outline-none text-[15px] leading-normal placeholder:text-[#7A809A]" />
      <div className="text-muted text-[12.5px]" role="status">{STATUS_TEXT[status] || 'Changes save automatically'}</div>
    </>
  );
}

export default function Scratchpad({ date }) {
  const [scope, setScope] = useState('day');
  const { data, isLoading, error, refetch } = useNote(scope, date);
  return (
    <Panel className="p-6 flex flex-col gap-3.5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-[19px] font-bold flex-1">Scratchpad</h2>
        {SCOPES.map(([k, label]) => (
          <Chip key={k} tone={scope === k ? 'ai' : 'pick'} aria-pressed={scope === k} onClick={() => setScope(k)}>{label}</Chip>
        ))}
      </div>
      {error ? <ErrorBox error={error} onRetry={refetch} />
        : isLoading ? <Skeleton className="h-[120px]" />
          : <Editor key={`${scope}-${date}`} scope={scope} date={date} initial={data?.text || ''} />}
    </Panel>
  );
}
