import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Panel from '../ui/Panel';

export default function ReviewHeader({ meeting, easy, busy, onAcceptAll }) {
  return (
    <Panel className="px-6 py-5 flex flex-wrap items-center gap-[18px]">
      <span className="w-11 h-11 rounded-xl bg-accent-tint text-accent inline-flex items-center justify-center shrink-0"><Icon name="video" size={22} /></span>
      <div className="flex-[1_1_220px] min-w-0">
        <div className="text-[17px] font-bold">{meeting.title}</div>
        <div className="text-muted text-[13.5px] mt-0.5">{meeting.whenLabel}</div>
      </div>
      <div className="flex">
        {(meeting.attendees || []).map((a, i) => (
          <Avatar key={a.id} initials={a.initials} bg={a.bg} color={a.color} className={`ring-2 ring-white ${i ? '-ml-2' : ''}`} />
        ))}
      </div>
      <Button variant="secondary" disabled={!easy || busy} onClick={onAcceptAll}>
        {easy ? `Accept the ${easy} without conflicts` : 'Nothing else to accept'}
      </Button>
    </Panel>
  );
}
