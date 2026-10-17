import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Icon from '../Component/ui/Icon';
import ServiceBadge from '../Component/ui/ServiceBadge';
import { SEARCHES, SOURCES, UNDER_HOOD_SEARCH } from '../demo/googleData';
import UnderTheHood from '../Component/ui/UnderTheHood';

const SUGGEST = [['default', 'When is the payments launch?'], ['risk', 'Open risks for the launch'], ['budget', 'Fraud vendor decision']];
const STAGES = ['Understanding the question', 'Searching Drive, Gmail, Meet, Docs, Jira', 'Filtering by your permissions', 'Grounding the answer with Gemini'];

export default function Search() {
  const [key, setKey] = useState('default');
  const [stage, setStage] = useState(STAGES.length);
  const [filter, setFilter] = useState('all');
  const cur = SEARCHES[key];
  const busy = stage < STAGES.length;

  const run = (k) => {
    setKey(k); setFilter('all'); setStage(0);
    [1, 2, 3, 4].forEach((i) => setTimeout(() => setStage(i), i * 600));
  };
  const shown = cur.results.filter((r) => filter === 'all' || r.src === filter);

  return (
    <>
      <PageHeader title="Enterprise search" subtitle="One question across Drive, Gmail, Meet, Docs and Jira. Powered by Vertex AI Search and Gemini.">
        <Chip tone="ai" size="g"><Icon name="spark" size={15} />Grounded answers only</Chip>
      </PageHeader>

      <Panel className="p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-field-border bg-surface">
          <Icon name="search" size={20} className="text-muted" />
          <span className="flex-1 text-[15.5px]">{cur.q}</span>
          <Button size="sm" onClick={() => run(key)}>Search</Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-muted text-[13px]">Try:</span>
          {SUGGEST.map(([k, l]) => <Chip key={k} tone={k === key ? 'picked' : 'pick'} size="s" onClick={() => run(k)}>{l}</Chip>)}
        </div>
      </Panel>

      {busy ? (
        <Panel className="p-6 flex flex-col gap-3">
          {STAGES.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 ${i > stage ? 'opacity-35' : ''}`}>
              {i < stage ? <Icon name="check" size={18} className="text-ok" sw={2.5} /> : <Icon name="refresh" size={18} className={i === stage ? 'animate-spin' : ''} />}
              <span className="font-semibold">{s}</span>
            </div>
          ))}
        </Panel>
      ) : (
        <div className="flex flex-wrap gap-6 items-start">
          <Panel className="flex-[999_1_480px] min-w-0 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Icon name="spark" size={20} className="text-accent" />
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Answer</h2>
              <Chip tone="quiet">gemini-2.5-pro on Vertex AI</Chip>
            </div>
            <p className="text-[16px] leading-[1.65]">
              {cur.answer.map((a, i) => (
                <span key={i}>{a.t} {a.c.map((n) => <sup key={n} className="inline-flex items-center justify-center w-[18px] h-[18px] mx-px rounded-full bg-accent-tint text-accent-ink text-[11px] font-bold">{n}</sup>)}{' '}</span>
              ))}
            </p>
            <div className="text-muted text-[13px] flex items-center gap-2"><Icon name="shield" size={15} />Sentences without a source are dropped. You only see documents you can open.</div>
            <UnderTheHood>
              <div><span className="text-[#9AA7FF]">engine</span>  {UNDER_HOOD_SEARCH[key].engine}</div>
              <pre className="whitespace-pre-wrap">{UNDER_HOOD_SEARCH[key].query}</pre>
              <div><span className="text-[#9AA7FF]">model</span>   {UNDER_HOOD_SEARCH[key].model}</div>
              <div><span className="text-[#9AA7FF]">latency</span> {UNDER_HOOD_SEARCH[key].latency}</div>
            </UnderTheHood>
          </Panel>

          <div className="flex-[1_1_340px] min-w-0 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip tone={filter === 'all' ? 'picked' : 'pick'} size="s" onClick={() => setFilter('all')}>All {cur.results.length}</Chip>
              {Object.entries(SOURCES).filter(([k]) => cur.results.some((r) => r.src === k)).map(([k, v]) => (
                <Chip key={k} tone={filter === k ? 'picked' : 'pick'} size="s" onClick={() => setFilter(k)}>{v.label}</Chip>
              ))}
            </div>
            {shown.map((r) => (
              <Panel key={r.n} className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-[22px] h-[22px] rounded-full bg-accent-tint text-accent-ink text-[12px] font-bold inline-flex items-center justify-center">{r.n}</span>
                  <span className="flex-1 font-bold">{r.title}</span>
                  <ServiceBadge name={SOURCES[r.src].label} color={SOURCES[r.src].color} />
                </div>
                <p className="text-[13.5px] leading-[1.5] border-l-[3px] border-field-border pl-3 text-quiet-ink">{r.snip}</p>
                <div className="flex text-muted text-[12.5px]"><span className="flex-1">{r.who}</span><span>Relevance {r.score.toFixed(2)}</span></div>
              </Panel>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
