import { useEffect, useRef, useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Icon from '../Component/ui/Icon';
import { AGENT_ACTIONS, AGENT_STEPS, UNDER_HOOD_AGENT } from '../demo/googleData';
import UnderTheHood from '../Component/ui/UnderTheHood';
import ServiceBadge from '../Component/ui/ServiceBadge';

export default function Agent() {
  const [done, setDone] = useState(-1);      // index of last finished step
  const [running, setRunning] = useState(false);
  const [applied, setApplied] = useState({});
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finished = done === AGENT_STEPS.length - 1;
  const start = () => {
    timers.current.forEach(clearTimeout);
    setApplied({}); setDone(-1); setRunning(true);
    let t = 0;
    AGENT_STEPS.forEach((s, i) => {
      t += s.ms;
      timers.current.push(setTimeout(() => { setDone(i); if (i === AGENT_STEPS.length - 1) setRunning(false); }, t));
    });
  };
  const apply = (id) => setApplied((a) => ({ ...a, [id]: 'busy' })) || setTimeout(() => setApplied((a) => ({ ...a, [id]: 'done' })), 900);
  const approveAll = () => AGENT_ACTIONS.forEach((a, i) => !applied[a.id] && setTimeout(() => apply(a.id), i * 500));

  return (
    <>
      <PageHeader title="Launch readiness agent" subtitle="An ADK agent on Vertex AI Agent Engine. It plans, calls Google tools, then waits for your approval.">
        <Chip tone="ai" size="g"><Icon name="spark" size={15} />Agent Engine · adk-launch-readiness</Chip>
        <Button onClick={start} disabled={running}><Icon name="play" size={14} />{finished ? 'Run again' : running ? 'Running' : 'Run agent'}</Button>
      </PageHeader>

      <Panel className="p-5 flex flex-wrap gap-4 items-center">
        <span className="text-muted text-[13px]">Task</span>
        <span className="flex-1 font-semibold min-w-[260px]">"Get me ready for the payments launch review on Friday."</span>
        <Chip tone="quiet">Runs as Anika · read permissions only</Chip>
      </Panel>

      <div className="flex flex-wrap gap-6 items-start">
        <Panel className="flex-[1_1_440px] min-w-0 p-6 flex flex-col gap-1">
          <h2 className="text-[19px] font-bold mb-3">Agent trace</h2>
          {AGENT_STEPS.map((s, i) => {
            const state = i <= done ? 'done' : i === done + 1 && running ? 'run' : 'wait';
            return (
              <div key={s.title} className={`flex gap-3.5 py-3 border-t border-divider first:border-t-0 ${state === 'wait' ? 'opacity-40' : ''}`}>
                <span className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: state === 'done' ? '#E3F4EC' : '#E8EAFB' }}>
                  {state === 'done' ? <Icon name="check" size={16} color="#12795A" sw={2.5} /> : <Icon name="refresh" size={16} color="#3540D3" className={state === 'run' ? 'animate-spin' : ''} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.title}</span>
                    <ServiceBadge name={s.svc} color={s.color} />
                  </div>
                  {state === 'done' && <p className="text-muted text-[13.5px] mt-1">{s.out}</p>}
                  {state === 'run' && <p className="text-accent-ink text-[13.5px] mt-1">Calling tool...</p>}
                </div>
              </div>
            );
          })}
          {done < 0 && !running && <p className="text-muted mt-2">Press Run agent to start.</p>}
          {finished && (
            <div className="pt-4 border-t border-divider mt-2">
              <UnderTheHood label="API calls">
                {UNDER_HOOD_AGENT.map((c) => (
                  <div key={c.api}><span className="text-[#9AA7FF]">{c.svc}</span> {c.api}<div className="text-[#8E96CC] pl-3">{c.detail}</div></div>
                ))}
              </UnderTheHood>
            </div>
          )}
        </Panel>

        <div className="flex-[1_1_440px] min-w-0 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 text-[19px] font-bold">Proposed actions</h2>
            {finished && <Button size="sm" onClick={approveAll}>Approve all</Button>}
          </div>
          {!finished && <Panel className="p-6 text-muted">Actions appear here once the agent finishes. Nothing is written to Google until you approve it.</Panel>}
          {finished && AGENT_ACTIONS.map((a) => (
            <Panel key={a.id} className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex-1 font-bold">{a.title}</span>
                <ServiceBadge name={a.svc} color={a.color} />
              </div>
              <p className="text-[13.5px] leading-[1.55] text-quiet-ink">{a.body}</p>
              {applied[a.id] === 'done'
                ? <div className="text-ok-ink font-semibold text-[13.5px] flex items-center gap-2"><Icon name="check" size={16} sw={2.5} />{a.done}</div>
                : <Button variant="secondary" size="sm" className="self-start" disabled={applied[a.id] === 'busy'} onClick={() => apply(a.id)}>{applied[a.id] === 'busy' ? 'Working...' : a.cta}</Button>}
            </Panel>
          ))}
        </div>
      </div>
    </>
  );
}
