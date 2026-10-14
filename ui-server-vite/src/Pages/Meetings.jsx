import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Avatar from '../Component/ui/Avatar';
import Icon from '../Component/ui/Icon';
import { MEETINGS, PEOPLE } from '../demo/specData';

export default function Meetings() {
  const [id, setId] = useState('m1');
  const [showEn, setShowEn] = useState(true);
  const m = MEETINGS.find((x) => x.id === id);
  return (
    <>
      <PageHeader title="Meetings" subtitle="Every Meet transcript, with the decisions DayGraph found and the exact words behind them.">
        <Chip tone="ok" size="g"><Icon name="video" size={15} />Synced from Google Meet</Chip>
      </PageHeader>
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[1_1_300px] max-w-[380px] min-w-0 flex flex-col gap-3">
          {MEETINGS.map((x) => (
            <button key={x.id} type="button" onClick={() => setId(x.id)} aria-pressed={x.id === id}
              className={`w-full p-4 rounded-[14px] border flex flex-col gap-2 ${x.id === id ? 'bg-accent-tint border-accent' : 'bg-white border-border hover:bg-ground'}`}>
              <span className="font-bold">{x.title}</span>
              <span className="text-muted text-[13px]">{x.when} · {x.dur}</span>
              <span className="flex flex-wrap gap-2"><Chip tone="ai">{x.decisions} decisions</Chip><Chip>{x.tasks} tasks</Chip>{x.lang !== 'English' && <Chip tone="warn">{x.lang}</Chip>}</span>
            </button>
          ))}
        </div>
        <div className="flex-[999_1_480px] min-w-0 flex flex-col gap-6">
          <Panel className="p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="flex-1 text-[19px] font-bold">{m.title}</h2>
              <div className="flex -space-x-1.5">{m.people.map((p) => <Avatar key={p} initials={p} bg={PEOPLE[p].bg} color={PEOPLE[p].color} size={28} />)}</div>
              {m.lang !== 'English' && <Chip tone="quiet" onClick={() => setShowEn(!showEn)}>{showEn ? 'Hide' : 'Show'} English</Chip>}
            </div>
            <ul className="flex flex-col gap-3">
              {m.transcript.map((l) => (
                <li key={l.t} className="flex gap-3">
                  <span className="w-12 text-muted text-[13px] pt-0.5">{l.t}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-[13.5px]">{PEOPLE[l.who].name}</div>
                    <p className={`leading-[1.55] ${l.dec ? 'bg-warn-tint rounded-md px-2 py-1 inline' : ''}`}>{l.text}</p>
                    {l.en && showEn && <p className="text-muted text-[13.5px] mt-1">English: {l.en}</p>}
                    {l.dec && <div className="mt-1.5"><Chip tone="ai"><Icon name="spark" size={13} />Decision: {l.dec}</Chip></div>}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[17px] font-bold">Timeline</h2>
            {m.timeline.map((t) => <div key={t} className="flex items-center gap-3 text-[13.5px]"><span className="w-2 h-2 rounded-full bg-accent shrink-0" />{t}</div>)}
          </Panel>
        </div>
      </div>
    </>
  );
}
