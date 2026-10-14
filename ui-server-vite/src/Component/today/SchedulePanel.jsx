import { useNavigate } from 'react-router-dom';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel from '../ui/Panel';

function Row({ time, bg, children }) {
  return (
    <div className="flex gap-3.5 items-stretch">
      <div className="text-muted w-[46px] shrink-0 text-[13px] tabular-nums pt-3">{time}</div>
      <div className={`flex-1 min-w-0 px-3.5 py-3 rounded-[10px] border ${bg}`}>{children}</div>
    </div>
  );
}

export default function SchedulePanel({ day }) {
  const navigate = useNavigate();
  return (
    <Panel className="px-6 pt-6 pb-[22px]">
      <h2 className="text-[19px] font-bold">Schedule</h2>
      <p className="text-muted mt-1 text-[13.5px]">Focus blocks are placed around your meetings.</p>
      <div className="mt-[18px] flex flex-col gap-2.5">
        {(day.schedule || []).map((s) => {
          if (s.kind === 'meeting') {
            const ended = s.state === 'ended';
            const n = s.pendingDecisions || 0;
            return (
              <Row key={`${s.kind}-${s.id}`} time={s.start} bg={ended ? 'bg-ground border-border' : 'bg-white border-[#D5D9E8]'}>
                <div className={`flex items-center gap-2 font-semibold ${ended ? 'text-muted' : 'text-ink'}`}>
                  <Icon name="video" size={16} sw={2} />{s.title}
                </div>
                <div className="text-muted text-[13px] mt-0.5">{ended ? `Ended ${s.end}` : `${s.start} to ${s.end}`}</div>
                {ended && n > 0 && (
                  <Chip tone="warn" className="mt-2.5" onClick={() => navigate('/review')}>
                    {n} {n === 1 ? 'decision' : 'decisions'} to review
                  </Chip>
                )}
              </Row>
            );
          }
          return (
            <Row key={`${s.kind}-${s.id}`} time={s.start} bg="bg-accent-tint border-[#C3C9F4]">
              <div className="flex items-center gap-2 font-semibold text-[#232B94]"><Icon name="spark" size={16} sw={2} />{s.title}</div>
              <div className="text-[13px] mt-0.5 text-[#3B4280]">{s.start} to {s.end}{s.reason ? `, ${s.reason}` : ''}</div>
              {s.movedByReplan && <Chip tone="aiwhite" className="mt-2">Moved by replan</Chip>}
            </Row>
          );
        })}
      </div>
    </Panel>
  );
}
