import Avatar from '../ui/Avatar';
import { initialsOf } from '../../lib/people';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel from '../ui/Panel';
import Quote from '../ui/Quote';
import ConflictCompare from './ConflictCompare';
import OwnerPicker from './OwnerPicker';
import { useUi } from '../../context/contexts';
import { useAcceptDecision, useDismiss, useKeepBoth, useSetOwner } from '../../api/hooks';

export default function DecisionCard({ d }) {
  const { flash } = useUi();
  const accept = useAcceptDecision();
  const keepBoth = useKeepBoth();
  const dismiss = useDismiss();
  const setOwner = useSetOwner();
  const c = d.conflict;
  const earlierDate = c?.earlier?.meta?.replace(/^Decided\s*/i, '');
  const due = d.deadlineLabel ? (/^due/i.test(d.deadlineLabel) ? d.deadlineLabel : `Due ${d.deadlineLabel}`) : null;
  const sp = d.speaker || {};

  return (
    <Panel as="article" className="overflow-hidden">
      <div className="px-7 py-[26px] flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {c && <Chip tone="conflict"><Icon name="alert" size={14} sw={2.2} />Conflicts with a decision from {earlierDate || 'earlier'}</Chip>}
          {d.owner?.needsCheck && <Chip tone="warn"><Icon name="info" size={14} sw={2.2} />Check the owner</Chip>}
          {d.quoteVerified && <Chip tone="ok"><Icon name="shield" size={14} sw={2.2} />Verified in transcript</Chip>}
          {d.languageLabel && <Chip>{d.languageLabel}</Chip>}
        </div>
        <h3 className="text-[21px] leading-[1.3] font-semibold tracking-[-0.01em]">{d.statement}</h3>

        <div className="px-5 py-[18px] rounded-xl bg-surface-2 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Avatar initials={initialsOf(sp.name)} size={28} color="#171A2B" />
            <span className="font-semibold">{sp.name}</span>
            <span className="text-muted">said at</span>
            <button type="button" aria-label={`Open the meeting at ${d.offsetLabel}`}
              onClick={() => flash(`Opens the Meet recording at ${d.offsetLabel}.`)}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-surface border border-field-border font-semibold text-[12.5px] tabular-nums hover:bg-ground">
              <Icon name="play" size={14} sw={2.2} />{d.offsetLabel}
            </button>
          </div>
          <Quote kind={d.quoteClass}>{d.quote}</Quote>
          {d.translation && <Quote kind="q-tr">{d.translation}</Quote>}
        </div>

        {c && <ConflictCompare conflict={c} earlierDate={earlierDate} />}

        <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
          {d.owner && (
            <div className="flex items-center gap-2.5">
              <Avatar initials={d.owner.initials} bg={d.owner.bg} color="#171A2B" />
              <div>
                <div className="font-semibold">{d.owner.name}</div>
                <div className="text-muted text-[13px]">{d.owner.note}</div>
              </div>
            </div>
          )}
          {due && <div className="flex items-center gap-2 font-semibold"><Icon name="cal" size={18} sw={1.9} />{due}</div>}
          {d.taskTitle && <div className="text-muted text-[13.5px]">Creates a Google Task: {d.taskTitle}</div>}
        </div>

        {d.owner?.needsCheck && (
          <OwnerPicker owner={d.owner} onPick={(personId) => setOwner.mutate({ id: d.id, body: { personId } })} />
        )}

        <div className="flex flex-wrap gap-2.5 items-center">
          <Button disabled={accept.isPending}
            onClick={() => accept.mutate({ id: d.id, body: {}, message: c ? d.acceptedMessage || 'Accepted. The 3 Oct decision is now superseded.' : 'Task added to Google Tasks.' })}>
            {d.acceptLabel || 'Accept'}
          </Button>
          {c
            ? <Button variant="secondary" disabled={keepBoth.isPending} onClick={() => keepBoth.mutate({ id: d.id })}>Keep both</Button>
            : <Button variant="secondary" onClick={() => flash('This part of the product is not in the prototype.')}>Edit</Button>}
          <Button variant="ghost" disabled={dismiss.isPending} onClick={() => dismiss.mutate({ id: d.id })}>Dismiss</Button>
        </div>
      </div>
    </Panel>
  );
}
