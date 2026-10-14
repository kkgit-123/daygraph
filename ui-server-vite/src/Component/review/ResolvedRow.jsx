import Button from '../ui/Button';
import { CheckMark } from '../ui/Check';
import Panel from '../ui/Panel';
import { useUndoDecision } from '../../api/hooks';

export default function ResolvedRow({ d }) {
  const undo = useUndoDecision();
  const dismissed = d.state === 'dismissed';
  return (
    <Panel as="article" className="overflow-hidden">
      <div className={`px-7 py-5 flex flex-wrap items-center gap-3.5 ${dismissed ? 'bg-ground' : 'bg-[#F0FAF5]'}`}>
        {!dismissed && <CheckMark />}
        <div className="flex-[1_1_280px] min-w-0">
          <div className={dismissed ? 'font-semibold text-base text-muted line-through' : 'font-bold text-base'}>{d.statement}</div>
          <div className={`text-[14px] mt-0.5 ${dismissed ? 'text-muted' : 'text-ok-ink'}`}>
            {dismissed ? 'Dismissed. It stays in the audit log.' : d.acceptedMessage || 'Accepted. Task added to Google Tasks.'}
          </div>
        </div>
        <Button variant="secondary" size="sm" disabled={undo.isPending} onClick={() => undo.mutate({ id: d.id })}>Undo</Button>
      </div>
    </Panel>
  );
}
