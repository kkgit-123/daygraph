import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Icon from '../Component/ui/Icon';
import { ADDONS } from '../demo/specData';

function Frame({ app, color, title, children }) {
  return (
    <Panel className="flex flex-col overflow-hidden flex-[1_1_420px] min-w-0">
      <div className="px-5 py-3 flex items-center gap-3 border-b border-divider" style={{ background: `${color}14` }}>
        <span className="w-7 h-7 rounded-md text-white font-bold inline-flex items-center justify-center" style={{ background: color }}>{app[0]}</span>
        <span className="font-bold flex-1">{app}</span><span className="text-muted text-[12.5px]">{title}</span>
      </div>
      <div className="p-5 flex flex-col gap-3">{children}</div>
    </Panel>
  );
}

export default function Addons() {
  const [chat, setChat] = useState('open');
  const [task, setTask] = useState(false);
  const [owned, setOwned] = useState(false);
  return (
    <>
      <PageHeader title="Workspace add-ons" subtitle="DayGraph where you already work: Chat, Gmail, Calendar and Meet. Same decisions, same approvals.">
        <Chip tone="ai" size="g">Workspace add-on on Cloud Run</Chip>
      </PageHeader>
      <div className="flex flex-wrap gap-6 items-start">
        <Frame app="Google Chat" color="#00897B" title="DayGraph app, Cards v2">
          <div className="bg-ground rounded-xl p-4 flex flex-col gap-2.5">
            <div className="font-bold">{ADDONS.chat.title}</div>
            <p className="text-[13.5px] leading-[1.5]">{ADDONS.chat.body}</p>
            <div className="text-muted text-[12.5px]">{ADDONS.chat.meta}</div>
            {chat === 'open' ? (
              <div className="flex gap-2"><Button size="sm" onClick={() => setChat('accepted')}>Accept</Button><Button size="sm" variant="secondary">Edit</Button><Button size="sm" variant="ghost" onClick={() => setChat('dismissed')}>Dismiss</Button></div>
            ) : <Chip tone={chat === 'accepted' ? 'ok' : 'quiet'}>{chat === 'accepted' ? 'Accepted. Task created, calendar updated.' : 'Dismissed'}</Chip>}
          </div>
          <div className="text-[13.5px] text-muted">Try <b className="text-ink">/daygraph ask when is the launch?</b> for a cited answer. A weekly digest is posted every Monday.</div>
        </Frame>
        <Frame app="Gmail" color="#D93025" title="Add-on side panel (stretch)">
          <div><div className="font-bold">{ADDONS.gmail.subject}</div><div className="text-muted text-[13px]">From {ADDONS.gmail.from}</div></div>
          <p className="leading-[1.55]">{ADDONS.gmail.body}</p>
          <div className="rounded-xl bg-accent-tint p-4 flex flex-col gap-2.5">
            <div className="text-accent-ink font-semibold text-[13.5px] flex items-center gap-2"><Icon name="spark" size={15} />{ADDONS.gmail.commit}</div>
            {task ? <Chip tone="ok" className="self-start">Task created in Google Tasks</Chip> : <Button size="sm" className="self-start" onClick={() => setTask(true)}>Create task from this commitment</Button>}
          </div>
        </Frame>
        <Frame app="Calendar" color="#1A73E8" title="Event add-on">
          <div><div className="font-bold">{ADDONS.cal.event}</div><div className="text-muted text-[13px]">{ADDONS.cal.when}</div></div>
          <div className="rounded-xl bg-conflict-tint text-conflict-ink p-4 flex gap-2.5 text-[13.5px] leading-[1.5]"><Icon name="alert" size={18} />{ADDONS.cal.warn}</div>
          <ul className="flex flex-col gap-1.5 text-[13.5px]">{ADDONS.cal.items.map((i) => <li key={i} className="flex items-center gap-2"><Icon name="check" size={14} color="#12795A" sw={2.5} />{i}</li>)}</ul>
        </Frame>
        <Frame app="Meet" color="#00897B" title="Live side panel">
          <div className="flex items-center gap-2 text-conflict font-semibold text-[13.5px]"><span className="w-2 h-2 rounded-full bg-conflict animate-pulse" />Live · Decisions so far</div>
          {ADDONS.meet.map((d) => <div key={d} className="p-3 rounded-lg bg-ground text-[13.5px]">{d}</div>)}
          <Button size="sm" variant={owned ? 'secondary' : 'primary'} className="self-start" onClick={() => setOwned(true)}>{owned ? 'You own this' : "I'll own this"}</Button>
        </Frame>
      </div>
    </>
  );
}
