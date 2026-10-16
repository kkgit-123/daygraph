import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../Component/layout/PageHeader';
import Panel, { PanelHeader } from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Icon from '../Component/ui/Icon';
import Workflow from '../Component/ai/Workflow';
import { AGENT_ACTIONS, AGENT_STEPS, UNDER_HOOD_AGENT } from '../demo/googleData';
import UnderTheHood from '../Component/ui/UnderTheHood';
import ServiceBadge from '../Component/ui/ServiceBadge';

const STAGES = [
  { key: 'understand', label: 'Understand', icon: 'msg', detail: 'Read the request' },
  { key: 'research', label: 'Research', icon: 'search', detail: 'Calendar, Drive, Gmail, Meet' },
  { key: 'analyse', label: 'Analyse', icon: 'graph', detail: 'Documents, conflicts, trends' },
  { key: 'draft', label: 'Draft', icon: 'edit', detail: 'Brief and follow-ups' },
  { key: 'review', label: 'Review', icon: 'user', detail: 'You approve each action' },
  { key: 'execute', label: 'Execute', icon: 'zap', detail: 'Only what you approved' },
];

/* trace step index -> pipeline stage */
const stageOf = (i) => (i <= 1 ? 1 : i <= 4 ? 2 : 3);
const now = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());

export default function Agent() {
  const [done, setDone] = useState(-1);      // index of last finished step
  const [running, setRunning] = useState(false);
  const [applied, setApplied] = useState({}); // id -> 'busy' | 'done' | 'rejected'
  const [edits, setEdits] = useState({});
  const [editing, setEditing] = useState(null);
  const [audit, setAudit] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finished = done === AGENT_STEPS.length - 1;
  const log = (text, tone = 'quiet') => setAudit((a) => [{ t: now(), text, tone }, ...a]);
  const start = () => {
    timers.current.forEach(clearTimeout);
    setApplied({}); setEdits({}); setEditing(null); setAudit([]); setDone(-1); setRunning(true);
    log('Run started: launch readiness');
    let t = 0;
    AGENT_STEPS.forEach((s, i) => {
      t += s.ms;
      timers.current.push(setTimeout(() => { setDone(i); if (i === AGENT_STEPS.length - 1) { setRunning(false); log(`${AGENT_ACTIONS.length} actions proposed, waiting for approval`, 'ai'); } }, t));
    });
  };
  const apply = (a) => {
    setApplied((x) => ({ ...x, [a.id]: 'busy' }));
    setEditing(null);
    timers.current.push(setTimeout(() => { setApplied((x) => ({ ...x, [a.id]: 'done' })); log(`Approved: ${a.title}`, 'ok'); }, 900));
  };
  const reject = (a) => { setApplied((x) => ({ ...x, [a.id]: 'rejected' })); setEditing(null); log(`Rejected: ${a.title}`, 'conflict'); };
  const approveAll = () => AGENT_ACTIONS.forEach((a, i) => !applied[a.id] && timers.current.push(setTimeout(() => apply(a), i * 500)));

  const decided = AGENT_ACTIONS.filter((a) => applied[a.id] === 'done' || applied[a.id] === 'rejected').length;
  const stage = !running && done < 0 ? -1 : running ? stageOf(done + 1) : decided === AGENT_ACTIONS.length ? STAGES.length : decided > 0 ? 5 : 4;
  const pending = AGENT_ACTIONS.filter((a) => !applied[a.id]).length;

  return (
    <>
      <PageHeader eyebrow="DayGraph Intelligence" title="Launch readiness agent" subtitle="An ADK agent on Vertex AI Agent Engine. It plans, calls Google tools, then waits for your approval.">
        <Chip tone="ai" size="g"><Icon name="bot" size={15} />Agent Engine · adk-launch-readiness</Chip>
        <Button variant="ai" onClick={start} loading={running}><Icon name="play" size={14} />{finished ? 'Run again' : running ? 'Running' : 'Run agent'}</Button>
      </PageHeader>

      <div role="note" className="flex items-start gap-3 px-4 py-3 rounded-xl border border-warn/30 bg-warn-tint text-warn-ink text-[13px] leading-[1.5]">
        <Icon name="info" size={16} className="mt-0.5" />
        <span><b>Demo run.</b> Steps, results and approvals on this page are simulated in the browser. Nothing is read from or written to Google.</span>
      </div>

      <Panel className="ambient overflow-hidden p-5 sm:p-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-ai-tint text-ai inline-flex items-center justify-center"><Icon name="msg" size={17} /></span>
          <div className="flex-1 min-w-[240px]">
            <div className="text-muted text-[12px] font-semibold uppercase tracking-[.06em]">Task</div>
            <div className="font-semibold text-[16px]">"Get me ready for the payments launch review on Friday."</div>
          </div>
          <Chip tone="quiet"><Icon name="shield" size={12} />Runs as Anika · read permissions only</Chip>
        </div>
        <Workflow steps={STAGES} current={stage} label="Agent progress" />
      </Panel>

      <div className="grid gap-6 items-start lg:grid-cols-2">
        <Panel className="min-w-0 p-5 sm:p-6 flex flex-col">
          <PanelHeader icon={<Icon name="layers" size={16} />} iconTone="ai" title="Agent trace" subtitle="Each tool call, in order, with what it found." />
          <ol className="mt-4 relative">
            {AGENT_STEPS.map((s, i) => {
              const state = i <= done ? 'done' : i === done + 1 && running ? 'run' : 'wait';
              const last = i === AGENT_STEPS.length - 1;
              return (
                <li key={s.title} className={`relative flex gap-3.5 pb-4 transition-opacity duration-300 ${state === 'wait' ? 'opacity-45' : ''}`}>
                  {!last && <span aria-hidden="true" className="absolute left-[15px] top-9 bottom-0 w-[2px] rounded-full bg-divider overflow-hidden">
                    <span className={`absolute inset-0 bg-[linear-gradient(180deg,var(--color-accent),var(--color-ai))] origin-top transition-transform duration-500 ${state === 'done' ? 'scale-y-100' : 'scale-y-0'}`} />
                    {state === 'run' && <span className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-ai animate-[slide-y_1.2s_ease-in-out_infinite]" />}
                  </span>}
                  <span className={`relative z-[1] w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 border-2 ${state === 'done' ? 'bg-ok-tint border-ok/50 text-ok' : state === 'run' ? 'bg-ai-tint border-ai text-ai pulse-ring' : 'bg-surface border-border text-faint'}`}>
                    {state === 'done' ? <Icon name="check" size={15} sw={2.6} /> : <Icon name="refresh" size={14} className={state === 'run' ? 'animate-spin' : ''} />}
                  </span>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[14px]">{s.title}</span>
                      <ServiceBadge name={s.svc} color={s.color} />
                    </div>
                    {state === 'done' && <p className="text-muted text-[13px] mt-1 leading-[1.5] animate-fade">{s.out}</p>}
                    {state === 'run' && <p className="text-ai-ink text-[13px] mt-1 breathe">Calling tool…</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {done < 0 && !running && <p className="text-muted text-[13.5px] flex items-center gap-2"><Icon name="play" size={13} />Press Run agent to start.</p>}
          {finished && (
            <div className="pt-4 border-t border-divider">
              <UnderTheHood label="API calls">
                {UNDER_HOOD_AGENT.map((c) => (
                  <div key={c.api}><span className="text-[#9AB8FF]">{c.svc}</span> {c.api}<div className="text-[#8E96CC] pl-3">{c.detail}</div></div>
                ))}
              </UnderTheHood>
            </div>
          )}
        </Panel>

        <div className="min-w-0 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="flex-1 text-[16px] font-semibold flex items-center gap-2"><Icon name="user" size={17} className="text-accent" />Review and approve</h2>
            {finished && pending > 0 && <Chip tone="warn">{pending} waiting</Chip>}
            {finished && pending > 0 && <Button size="sm" onClick={approveAll}><Icon name="check" size={14} sw={2.4} />Approve all</Button>}
          </div>
          {!finished && (
            <Panel className="p-6 flex flex-col items-center text-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-quiet-tint text-muted inline-flex items-center justify-center"><Icon name="shield" size={18} /></span>
              <div className="font-semibold">{running ? 'Agent is working…' : 'Nothing to review yet'}</div>
              <p className="text-muted text-[13px] max-w-[340px]">Actions appear here once the agent finishes. Nothing is written to Google until you approve it.</p>
            </Panel>
          )}
          {finished && (
            <Link to="/deep-review" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-ai/40 bg-ai-tint/50 text-[13px] hover:bg-ai-tint transition-colors">
              <Icon name="shield" size={15} className="text-ai" />
              <span className="flex-1"><b className="text-ai-ink">Planned:</b> run Deep Review on the brief before approving.</span>
              <Icon name="arrowR" size={14} className="text-ai" />
            </Link>
          )}
          {finished && AGENT_ACTIONS.map((a, i) => {
            const st = applied[a.id];
            const body = edits[a.id] ?? a.body;
            return (
              <Panel key={a.id} className={`stagger p-4 sm:p-5 flex flex-col gap-3 transition-opacity ${st === 'rejected' ? 'opacity-60' : ''}`} style={{ '--i': i }}>
                <div className="flex items-center gap-2.5">
                  <span className="flex-1 font-semibold">{a.title}</span>
                  <ServiceBadge name={a.svc} color={a.color} />
                </div>
                {editing === a.id ? (
                  <textarea value={body} onChange={(e) => setEdits((x) => ({ ...x, [a.id]: e.target.value }))} aria-label={`Edit ${a.title}`} autoFocus
                    className="w-full min-h-[96px] rounded-xl border border-accent bg-surface p-3 text-[13.5px] leading-[1.55] outline-none focus-visible:outline-none" />
                ) : (
                  <p className="text-[13.5px] leading-[1.6] text-quiet-ink">{body}{edits[a.id] && <span className="text-faint text-[12px]"> (edited)</span>}</p>
                )}
                {st === 'done' ? (
                  <div className="flex flex-wrap items-center gap-2 text-ok-ink font-semibold text-[13px] animate-fade"><Icon name="check" size={15} sw={2.5} />{a.done}<Chip tone="quiet">Simulated</Chip></div>
                ) : st === 'rejected' ? (
                  <div className="flex items-center gap-2 text-muted font-semibold text-[13px]"><Icon name="x" size={15} />Rejected. Nothing was created.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" loading={st === 'busy'} onClick={() => apply(a)}><Icon name="check" size={14} sw={2.4} />{a.cta}</Button>
                    <Button variant="secondary" size="sm" disabled={st === 'busy'} onClick={() => setEditing(editing === a.id ? null : a.id)}><Icon name="edit" size={13} />{editing === a.id ? 'Done editing' : 'Edit'}</Button>
                    <Button variant="ghost" size="sm" disabled={st === 'busy'} onClick={() => reject(a)}>Reject</Button>
                  </div>
                )}
              </Panel>
            );
          })}
          {audit.length > 0 && (
            <Panel className="p-4 sm:p-5">
              <div className="text-[12px] font-semibold uppercase tracking-[.06em] text-faint mb-2">Audit trail</div>
              <ul className="flex flex-col gap-1.5 text-[13px]" aria-live="polite">
                {audit.map((e, i) => (
                  <li key={`${e.t}-${i}`} className="flex gap-3 animate-fade">
                    <span className="text-faint tabular w-[62px] shrink-0">{e.t}</span>
                    <span className={e.tone === 'ok' ? 'text-ok-ink' : e.tone === 'conflict' ? 'text-conflict-ink' : e.tone === 'ai' ? 'text-ai-ink' : 'text-quiet-ink'}>{e.text}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
