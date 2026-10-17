import { useState } from 'react';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';
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
        className="w-full min-h-[132px] resize-y rounded-xl bg-surface-2/60 border border-border p-3.5 outline-none text-[14.5px] leading-[1.6] placeholder:text-faint focus:border-accent transition-colors focus-visible:outline-none" />
      <div className="text-muted text-[12px] inline-flex items-center gap-1.5" role="status">
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'pending' ? 'bg-warn breathe' : 'bg-ok'}`} />{STATUS_TEXT[status] || 'Changes save automatically'}
      </div>
    </>
  );
}

export default function Scratchpad({ date }) {
  const [scope, setScope] = useState('day');
  const { data, isLoading, error, refetch } = useNote(scope, date);
  return (
    <Panel className="p-5 sm:p-6 flex flex-col gap-3.5 stagger" style={{ '--i': 4 }}>
      <PanelHeader icon={<Icon name="edit" size={16} />} title="Scratchpad">
        <div className="flex gap-0.5 p-0.5 rounded-[10px] bg-surface-2 border border-border">
          {SCOPES.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)}
              className={`h-7 px-2.5 rounded-lg text-[12.5px] font-semibold transition-colors ${scope === k ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
      </PanelHeader>
      {error ? <ErrorBox error={error} onRetry={refetch} />
        : isLoading ? <Skeleton className="h-[132px]" />
          : <Editor key={`${scope}-${date}`} scope={scope} date={date} initial={data?.text || ''} />}
    </Panel>
  );
}
