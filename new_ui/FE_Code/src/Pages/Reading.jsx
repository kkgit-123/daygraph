import { useEffect, useRef, useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Field from '../Component/ui/Field';
import Icon from '../Component/ui/Icon';
import { READING } from '../demo/specData';

const STEPS = ['Validate URL, block private addresses', 'Fetch page (limit 5 MB, 15 s)', 'Extract readable text', 'Summarise with Gemini Flash', 'Tag, embed and link to your work'];

export default function Reading() {
  const [url, setUrl] = useState('https://cloud.google.com/blog/products/ai-machine-learning/adk-human-in-the-loop');
  const [step, setStep] = useState(-1);
  const [items, setItems] = useState(READING);
  const t = useRef([]);
  useEffect(() => () => t.current.forEach(clearTimeout), []);
  const save = () => {
    setStep(0);
    STEPS.forEach((_, i) => t.current.push(setTimeout(() => setStep(i + 1), (i + 1) * 800)));
    t.current.push(setTimeout(() => {
      setItems((l) => [{ title: 'ADK: confirming tool calls with a human', domain: 'cloud.google.com', saved: 'Just now', mins: 7, status: 'Summarised', tags: ['adk', 'agents'], sum: 'Explains the tool confirmation hook, how approvals are stored in the session, and how to resume a paused run.', why: 'Matches your Launch readiness agent approval step.' }, ...l]);
      setStep(-1);
    }, (STEPS.length + 1) * 800));
  };
  const busy = step >= 0;
  return (
    <>
      <PageHeader title="Saved reading" subtitle="Paste a link. An agent reads it, summarises it and connects it to your work, so you never need to reopen it." />
      <Panel className="p-5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <Field className="flex-1 min-w-[260px]" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Link to save" />
          <Button disabled={busy} onClick={save}><Icon name="plus" size={16} />Save link</Button>
        </div>
        {busy && <div className="flex flex-col gap-2 pt-1">{STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-3 ${i > step ? 'opacity-35' : ''}`}>
            {i < step ? <Icon name="check" size={17} className="text-ok" sw={2.5} /> : <Icon name="refresh" size={17} className={i === step ? 'animate-spin' : ''} />}<span className="font-semibold text-[13.5px]">{s}</span>
          </div>))}</div>}
      </Panel>
      <div className="flex flex-col gap-4">
        {items.map((r) => (
          <Panel key={r.title} className="p-5 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="flex-1 font-bold text-[16px]">{r.title}</h3>
              {r.tags.map((x) => <Chip key={x} tone="quiet">{x}</Chip>)}
              <Chip tone="ok">{r.status}</Chip>
            </div>
            <div className="text-muted text-[13px]">{r.domain} · {r.mins} min read · saved {r.saved}</div>
            <p className="leading-[1.55]">{r.sum}</p>
            <div className="text-accent-ink text-[13.5px] font-semibold flex items-center gap-2"><Icon name="link" size={14} />{r.why}</div>
          </Panel>
        ))}
      </div>
    </>
  );
}
