import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../Component/layout/PageHeader';
import Button from '../Component/ui/Button';
import Chip from '../Component/ui/Chip';
import Icon from '../Component/ui/Icon';
import Panel from '../Component/ui/Panel';
import { Skeleton } from '../Component/ui/States';
import { LogoMark } from '../Component/ui/Logo';
import SourcePane from '../Component/ask/SourcePane';
import Workflow from '../Component/ai/Workflow';
import { useAskFlow, useSuggestions } from '../api/hooks';
import { useUi } from '../context/contexts';

const SCOPES = [
  ['decisions', 'Decisions'], ['docs', 'Drive and Docs'], ['links', 'Saved reading'], ['notes', 'Notes'], ['ideas', 'Ideas'],
];
const NONE_TEXT = 'I could not find anything about that in what you can open. Try asking about a decision, a document, or something you saved.';

/*
  Progress for one question. The first steps advance on a timer while the request is in flight (they show
  what the server does, not measured timings); the result fills in the real numbers.
*/
function AskProgress({ status, scope, answer }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (status !== 'loading') return undefined;
    const t = [setTimeout(() => setPhase(1), 450), setTimeout(() => setPhase(2), 1300)];
    return () => t.forEach(clearTimeout);
  }, [status]);
  const n = answer?.citations?.length || 0;
  const grounded = answer?.grounded && answer.sentences?.length;
  const steps = [
    { key: 'u', label: 'Understand', icon: 'msg', detail: 'Read the question' },
    { key: 's', label: 'Search', icon: 'search', detail: `${scope.length} ${scope.length === 1 ? 'source' : 'sources'} you can open` },
    { key: 'v', label: 'Verify', icon: 'shield', detail: status === 'done' ? `${n} ${n === 1 ? 'citation' : 'citations'} checked` : 'Check every citation' },
    { key: 'a', label: 'Answer', icon: 'sparkles', detail: status === 'done' ? (grounded ? 'Grounded answer' : 'Nothing found, nothing guessed') : 'Only cited sentences' },
  ];
  const current = status === 'done' ? steps.length : phase;
  return <Workflow steps={steps} current={current} error={status === 'error'} label="How DayGraph is answering" />;
}

export default function Ask() {
  const { ask, setAsk, citeN, setCiteN } = useUi();
  const run = useAskFlow();
  const { data: suggestions = [] } = useSuggestions();
  const location = useLocation();
  const input = useRef(null);
  const [scope, setScope] = useState(() => SCOPES.map((s) => s[0]));
  const [text, setText] = useState('');

  useEffect(() => { if (location.state?.focus) input.current?.focus(); }, [location.key, location.state]);

  const send = (q) => {
    const question = (q ?? text).trim();
    if (!question) return;
    setText('');
    run(question, scope.length ? scope : undefined);
  };
  const toggle = (k) => setScope((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const reset = () => { setAsk({ question: '', answer: null, status: 'idle' }); setCiteN(null); input.current?.focus(); };

  const answer = ask.answer;
  const citation = answer?.citations?.find((c) => c.n === citeN);
  const grounded = answer?.grounded && answer.sentences?.length;

  const composer = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 p-1.5 pl-4 rounded-2xl border border-field-border bg-surface focus-within:border-ai focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-ai)_16%,transparent)] transition-[border-color,box-shadow]">
        <Icon name="sparkles" size={18} className="text-ai" />
        <input id="askInput" ref={input} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Ask about a decision, a document or something you saved"
          aria-label="Ask DayGraph" className="flex-1 min-w-0 h-11 bg-transparent outline-none text-[15px] placeholder:text-faint focus-visible:outline-none" />
        <button type="button" aria-label="Send question" onClick={() => send()} disabled={!text.trim() || ask.status === 'loading'}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[linear-gradient(135deg,#4C8DFF,#8B5CF6)] text-white shrink-0 transition-[filter,opacity] hover:brightness-110 disabled:opacity-40">
          <Icon name="send" size={17} sw={2} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-muted text-[12.5px] mr-1">Searching</span>
        {SCOPES.map(([k, label]) => (
          <Chip key={k} tone={scope.includes(k) ? 'ai' : 'pick'} aria-pressed={scope.includes(k)} onClick={() => toggle(k)}>
            {scope.includes(k) && <Icon name="check" size={11} sw={3} />}{label}
          </Chip>
        ))}
      </div>
    </div>
  );

  let body;
  if (ask.status === 'idle') {
    body = (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3 pt-6 pb-2">
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-[-14px] rounded-[22px] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-ai)_35%,transparent),transparent)] breathe" />
            <LogoMark size={52} className="relative" />
          </div>
          <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em]">What do you want to remember?</h2>
          <p className="text-muted text-[14.5px] leading-[1.6] max-w-[520px]">Ask about decisions from meetings, documents in Drive, and what you have saved or noted. Every answer shows where it came from.</p>
        </div>
        {composer}
        {suggestions.length > 0 && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {suggestions.map((s, i) => (
              <button key={s} type="button" onClick={() => send(s)} style={{ '--i': i }}
                className="stagger lift group flex items-start gap-3 w-full p-3.5 border border-border rounded-xl bg-surface-2/50 text-left hover:border-ai/40">
                <span className="w-7 h-7 rounded-lg bg-ai-tint text-ai inline-flex items-center justify-center shrink-0"><Icon name="msg" size={14} /></span>
                <span className="flex-1 font-medium text-[14px] leading-[1.45]">{s}</span>
                <Icon name="arrowR" size={15} className="text-faint mt-1 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-quiet-tint text-muted inline-flex items-center justify-center shrink-0"><Icon name="user" size={15} /></span>
          <div className="min-w-0">
            <div className="text-muted text-[12px] font-semibold uppercase tracking-[.06em]">You asked</div>
            <div className="text-[19px] font-semibold mt-0.5 leading-[1.4] tracking-[-0.01em]">{ask.question}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4 sm:p-5">
          <AskProgress key={ask.question} status={ask.status} scope={scope} answer={answer} />
        </div>
        {ask.status === 'loading' && <div className="flex flex-col gap-2.5"><Skeleton className="h-4 w-3/4 rounded-md" /><Skeleton className="h-4 w-full rounded-md" /><Skeleton className="h-4 w-2/3 rounded-md" /></div>}
        {ask.status === 'error' && <div role="alert" className="rounded-xl bg-conflict-tint text-conflict-ink font-semibold px-4 py-3 flex items-center gap-2.5"><Icon name="alert" size={17} />{ask.error || 'Something went wrong.'}</div>}
        {ask.status === 'done' && (
          <div className="relative px-5 sm:px-6 py-5 rounded-2xl border border-ai/25 bg-[linear-gradient(180deg,var(--color-ai-tint),transparent_70%)] animate-rise">
            <div className="flex items-center gap-2 font-semibold text-ai-ink text-[13px]"><LogoMark size={20} />DayGraph
              {grounded ? <Chip tone="ok" className="ml-1"><Icon name="shield" size={11} />Grounded</Chip> : <Chip className="ml-1">No source found</Chip>}
            </div>
            <p className="mt-3 text-[16.5px] leading-[1.8]">
              {grounded ? answer.sentences.map((s, i) => (
                <span key={i}>
                  {s.text}{' '}
                  {(s.cites || []).map((n) => (
                    <button key={n} type="button" aria-label={`Show source ${n}`} aria-pressed={citeN === n} onClick={() => setCiteN(n)}
                      className={`inline-flex items-center justify-center min-w-[22px] h-[22px] mx-1 px-1.5 rounded-md font-bold text-[11.5px] align-[2px] transition-colors ${citeN === n ? 'bg-accent text-on-accent' : 'bg-accent-tint text-accent-ink hover:bg-accent/25'}`}>
                      {n}
                    </button>
                  ))}
                </span>
              )) : NONE_TEXT}
            </p>
            <div className="text-muted mt-3.5 text-[13px] flex items-center gap-1.5"><Icon name="info" size={14} />{answer.footer || (grounded ? 'Every sentence links to a source you can open.' : 'Nothing found. DayGraph never guesses.')}</div>
          </div>
        )}
        <div className="flex flex-col gap-4 pt-4 border-t border-divider">
          {composer}
          <Button variant="ghost" size="sm" className="self-start" onClick={reset}><Icon name="refresh" size={14} />Start over</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="DayGraph Intelligence" title="Ask DayGraph" subtitle="Answers come only from what you can already open in Google Workspace.">
        <Chip tone="ai" size="g"><Icon name="shield" size={14} />Cited answers only</Chip>
      </PageHeader>
      <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <Panel className="min-w-0 p-5 sm:p-7 flex flex-col gap-6">{body}</Panel>
        <SourcePane citation={citation} />
      </div>
    </>
  );
}
