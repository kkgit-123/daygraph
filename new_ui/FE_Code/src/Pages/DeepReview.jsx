import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../Component/layout/PageHeader';
import Panel, { PanelHeader } from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Icon from '../Component/ui/Icon';
import Workflow from '../Component/ai/Workflow';
import {
  DEEP_REVIEW_FACTS, DEEP_REVIEW_SOURCE, DEEP_REVIEW_STAGES, FITS, PLAN, SAMPLE_DOC, SAMPLE_FINDINGS,
} from '../demo/deepReviewData';

const TONE_ICON = { conflict: 'alert', warn: 'info', ai: 'sparkles', ok: 'check' };
const TONE_BAR = { conflict: 'bg-conflict', warn: 'bg-warn', ai: 'bg-ai', ok: 'bg-ok' };

export default function DeepReview() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(-1);
  const [open, setOpen] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const done = stage >= DEEP_REVIEW_STAGES.length;
  const running = stage >= 0 && !done;
  const run = () => {
    timers.current.forEach(clearTimeout);
    setOpen(null); setStage(0);
    timers.current = DEEP_REVIEW_STAGES.map((_, i) => setTimeout(() => setStage(i + 1), (i + 1) * 900));
  };
  const issues = SAMPLE_FINDINGS.filter((f) => f.tone !== 'ok').length;

  return (
    <>
      <PageHeader eyebrow="Planned integration" title="Deep Review"
        subtitle="Rigorous, grounded verification for the long documents DayGraph helps you write, before anyone acts on them.">
        <Chip tone="ai" size="g"><Icon name="sparkles" size={14} />From Google Research</Chip>
        <Button variant="ai" onClick={run} loading={running}><Icon name="play" size={14} />{done ? 'Run sample again' : 'Run sample review'}</Button>
      </PageHeader>

      <div role="note" className="flex items-start gap-3 px-4 py-3 rounded-xl border border-warn/30 bg-warn-tint text-warn-ink text-[13px] leading-[1.5]">
        <Icon name="info" size={16} className="mt-0.5" />
        <span><b>Not connected yet.</b> DayGraph does not call Deep Review today. The run and findings below are hand-written sample output that shows the planned experience.</span>
      </div>

      <Panel className="ambient overflow-hidden p-5 sm:p-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent-tint text-accent inline-flex items-center justify-center"><Icon name="book" size={18} /></span>
          <div className="flex-1 min-w-[220px]">
            <div className="font-semibold text-[16px]">{SAMPLE_DOC.title}</div>
            <div className="text-muted text-[13px]">{SAMPLE_DOC.from} · {SAMPLE_DOC.sections.length} sections</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_DOC.sections.map((s, i) => (
              <Chip key={s} tone={stage >= 1 ? 'accent' : 'quiet'} className="transition-colors" style={{ transitionDelay: `${i * 80}ms` }}>{s}</Chip>
            ))}
          </div>
        </div>
        <Workflow steps={DEEP_REVIEW_STAGES} current={stage} label="Deep Review progress" />
      </Panel>

      <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <Panel className="min-w-0 p-5 sm:p-6 flex flex-col gap-4">
          <PanelHeader icon={<Icon name="shield" size={16} />} iconTone="ai" title="Findings"
            subtitle={done ? `${issues} issues to look at, 1 claim verified` : 'Run the sample to see what a review returns.'}>
            {done && <Chip tone="quiet">Sample</Chip>}
          </PanelHeader>
          {!done ? (
            <div className="flex flex-col gap-2.5" aria-hidden={!running}>
              {[0, 1, 2].map((i) => <div key={i} className={`h-[74px] rounded-xl border border-dashed border-border ${running ? 'skeleton border-transparent' : ''}`} />)}
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {SAMPLE_FINDINGS.map((f, i) => (
                <li key={f.id} className="stagger relative overflow-hidden rounded-xl border border-border bg-surface-2/40" style={{ '--i': i }}>
                  <span aria-hidden="true" className={`absolute left-0 inset-y-0 w-[3px] ${TONE_BAR[f.tone]}`} />
                  <button type="button" aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)}
                    className="w-full text-left p-3.5 pl-4 flex gap-3 items-start hover:bg-quiet-tint/50 transition-colors">
                    <Chip tone={f.tone} className="shrink-0 mt-0.5"><Icon name={TONE_ICON[f.tone]} size={12} sw={2.2} />{f.kind}</Chip>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-[14px] leading-[1.4]">{f.title}</span>
                      <span className="block text-muted text-[12.5px] mt-0.5">Section: {f.section}</span>
                    </span>
                    <Icon name="chevD" size={15} className={`text-faint mt-1 transition-transform ${open === f.id ? 'rotate-180' : ''}`} />
                  </button>
                  {open === f.id && (
                    <div className="px-4 pb-3.5 -mt-1 flex flex-col gap-2 text-[13.5px] leading-[1.55] animate-fade">
                      <p className="text-quiet-ink">{f.body}</p>
                      {f.fix && <p className="rounded-lg bg-ai-tint px-3 py-2"><b className="text-ai-ink">Suggested fix: </b>{f.fix}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel as="aside" className="min-w-0 p-5 sm:p-6 flex flex-col gap-4">
          <PanelHeader icon={<Icon name="info" size={16} />} title="About Deep Review" subtitle={`${DEEP_REVIEW_SOURCE.org} · ${DEEP_REVIEW_SOURCE.date}`} />
          <dl className="flex flex-col gap-3">
            {DEEP_REVIEW_FACTS.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] font-semibold uppercase tracking-[.06em] text-faint">{k}</dt>
                <dd className="text-[13.5px] leading-[1.55] mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
          <a href={DEEP_REVIEW_SOURCE.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-accent hover:underline">
            Read the announcement<Icon name="external" size={13} />
          </a>
          <p className="text-faint text-[11.5px] leading-[1.5]">Summary written by the DayGraph team. Deep Review is a Google Research product; DayGraph is not affiliated with it.</p>
        </Panel>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Where it fits in DayGraph</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FITS.map((f, i) => (
            <button key={f.title} type="button" onClick={() => navigate(f.to)} style={{ '--i': i }}
              className="spotlight stagger lift text-left rounded-2xl border border-border bg-surface shadow-card p-4 flex flex-col gap-2">
              <span className="w-8 h-8 rounded-[9px] bg-accent-tint text-accent inline-flex items-center justify-center"><Icon name={f.icon} size={16} /></span>
              <span className="font-semibold text-[14px]">{f.title}</span>
              <span className="text-muted text-[13px] leading-[1.5]">{f.body}</span>
            </button>
          ))}
        </div>
      </section>

      <Panel className="p-5 sm:p-6 flex flex-col gap-4">
        <PanelHeader icon={<Icon name="layers" size={16} />} title="Integration plan" subtitle="How DayGraph would call it. Nothing here runs yet." />
        <ol className="grid gap-3 md:grid-cols-4">
          {PLAN.map(([k, v], i) => (
            <li key={k} className="relative rounded-xl border border-border bg-surface-2/40 p-4">
              <span className="text-[11.5px] font-bold text-accent tabular">STEP {i + 1}</span>
              <div className="font-semibold mt-1">{k}</div>
              <p className="text-muted text-[13px] leading-[1.5] mt-1">{v}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}
