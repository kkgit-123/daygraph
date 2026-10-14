import Chip from '../ui/Chip';

export default function OwnerPicker({ owner, onPick }) {
  const cands = owner.candidates || [];
  const confirmed = owner.note === 'Confirmed by you';
  const first = (cands[0]?.name || '').split(' ')[0];
  return (
    <div className="flex flex-wrap gap-2.5 items-center px-4 py-3.5 rounded-[10px] bg-warn-tint text-warn-ink">
      <span className="font-semibold text-[14px]">
        {cands.length === 2 && first ? `Check the owner: two people named ${first} were invited.` : 'Check the owner'}
      </span>
      {cands.map((c) => {
        const picked = confirmed && owner.personId === c.personId;
        return (
          <Chip key={c.personId} tone={picked ? 'picked' : 'pick'} size="f" aria-pressed={picked} onClick={() => onPick(c.personId)}>
            {c.name}{c.role ? ` (${c.role})` : ''}
          </Chip>
        );
      })}
    </div>
  );
}
