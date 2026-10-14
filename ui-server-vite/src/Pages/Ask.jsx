import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../Component/layout/PageHeader';
import Button from '../Component/ui/Button';
import Chip from '../Component/ui/Chip';
import Field from '../Component/ui/Field';
import Icon from '../Component/ui/Icon';
import Panel from '../Component/ui/Panel';
import { Skeleton } from '../Component/ui/States';
import SourcePane from '../Component/ask/SourcePane';
import { useAskFlow, useSuggestions } from '../api/hooks';
import { useUi } from '../context/contexts';

const SCOPES = [
  ['decisions', 'Decisions'], ['docs', 'Drive and Docs'], ['links', 'Saved reading'], ['notes', 'Notes'], ['ideas', 'Ideas'],
];
const NONE_TEXT = 'I could not find anything about that in what you can open. Try asking about a decision, a document, or something you saved.';

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
  const reset = () => { setAsk({ question: '', answer: null, status: 'idle' }); setCiteN(null); };

  const answer = ask.answer;
  const citation = answer?.citations?.find((c) => c.n === citeN);
  const grounded = answer?.grounded && answer.sentences?.length;

  let body;
  if (ask.status === 'idle') {
    body = (
      <div className="flex flex-col gap-5 pt-2 pb-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.01em]">What do you want to remember?</h2>
          <p className="text-muted mt-1.5 text-[15px] leading-normal max-w-[560px]">Ask about decisions from meetings, documents in Drive, and what you have saved or noted. Every answer shows where it came from.</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => send(s)}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 border border-[#D5D9E8] rounded-xl bg-white font-semibold text-[15px] hover:bg-[#F7F8FC] hover:border-[#B9BFF2]">
              <Icon name="msg" size={18} sw={1.9} color="#3540D3" /><span>{s}</span>
            </button>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-[22px]">
        <div>
          <div className="text-muted text-[13px] font-semibold">You asked</div>
          <div className="text-[20px] font-bold mt-1 leading-[1.35]">{ask.question}</div>
        </div>
        {ask.status === 'loading' && <Skeleton className="h-32" />}
        {ask.status === 'error' && <div role="alert" className="text-conflict-ink font-semibold">{ask.error || 'Something went wrong.'}</div>}
        {ask.status === 'done' && (
          <div className="px-6 py-[22px] rounded-[14px] bg-[#F5F6FB]">
            <div className="flex items-center gap-2 font-bold text-accent-ink"><Icon name="spark" size={16} sw={2} />DayGraph</div>
            <p className="mt-2.5 text-[17px] leading-[1.75]">
              {grounded ? answer.sentences.map((s, i) => (
                <span key={i}>
                  {s.text}{' '}
                  {(s.cites || []).map((n) => (
                    <button key={n} type="button" aria-label={`Show source ${n}`} aria-pressed={citeN === n} onClick={() => setCiteN(n)}
                      className={`inline-flex items-center justify-center min-w-6 h-6 mx-1.5 px-1.5 rounded-[7px] font-bold text-[12.5px] align-[1px] ${citeN === n ? 'bg-accent text-white' : 'bg-accent-tint text-accent-ink hover:bg-[#D7DBF8]'}`}>
                      {n}
                    </button>
                  ))}
                </span>
              )) : NONE_TEXT}
            </p>
            <div className="text-muted mt-3.5 text-[13.5px]">{answer.footer || (grounded ? 'Every sentence links to a source you can open.' : 'Nothing found. DayGraph never guesses.')}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="self-start" onClick={reset}>Ask something else</Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Ask DayGraph" subtitle="Answers come only from what you can already open in Google Workspace." />
      <div className="flex flex-wrap gap-6 items-start">
        <Panel className="flex-[999_1_520px] min-w-0 px-8 py-7 flex flex-col gap-6">
          {body}
          <div className="pt-5 flex flex-col gap-3 border-t border-divider">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-muted text-[13.5px]">Searching</span>
              {SCOPES.map(([k, label]) => (
                <Chip key={k} tone={scope.includes(k) ? 'ai' : 'pick'} aria-pressed={scope.includes(k)} onClick={() => toggle(k)}>{label}</Chip>
              ))}
            </div>
            <div className="flex gap-2.5">
              <Field id="askInput" ref={input} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                placeholder="Ask about a decision, a document or something you saved" aria-label="Ask DayGraph" />
              <button type="button" aria-label="Send question" onClick={() => send()}
                className="inline-flex items-center justify-center w-11 h-11 rounded-[10px] bg-accent text-white shrink-0 hover:bg-accent-hover">
                <Icon name="send" size={20} sw={2} />
              </button>
            </div>
          </div>
        </Panel>
        <SourcePane citation={citation} />
      </div>
    </>
  );
}
