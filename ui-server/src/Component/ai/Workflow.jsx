import Icon from '../ui/Icon';

/*
  Step pipeline for AI work (Understand -> Research -> ... -> Execute).
  steps: [{ key, label, icon, detail? }]; current: index of the active step (steps.length = all done, -1 = idle).
  Horizontal from md up, vertical on phones. The travelling dot marks the hand-off into the active step.
*/
export default function Workflow({ steps, current, error = false, label = 'Workflow progress' }) {
  const state = (i) => (i < current ? 'done' : i === current ? (error ? 'error' : 'run') : 'wait');
  const live = steps[current];
  return (
    <div>
      <ol aria-label={label} className="flex flex-col md:flex-row md:items-start">
        {steps.map((s, i) => {
          const st = state(i);
          const filledIn = i > 0 && state(i - 1) === 'done' && st !== 'wait';
          const filledOut = i < steps.length - 1 && st === 'done' && state(i + 1) !== 'wait';
          const fill = 'absolute inset-0 bg-[linear-gradient(90deg,var(--color-accent),var(--color-ai))] transition-transform duration-500';
          return (
            <li key={s.key || s.label} className="flex md:flex-1 md:flex-col md:items-center relative">
              {/* desktop: line from the previous node into this one */}
              {i > 0 && (
                <span aria-hidden="true" className="hidden md:block absolute top-[17px] right-[calc(50%+22px)] w-[calc(100%-44px)] h-[2px] rounded-full bg-divider">
                  <span className={`${fill} origin-left ${filledIn ? 'scale-x-100' : 'scale-x-0'}`} />
                  {st === 'run' && <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-ai shadow-[0_0_10px_var(--color-ai)] animate-[slide-x_1.4s_ease-in-out_infinite]" />}
                </span>
              )}
              {/* phone: line from this node down to the next one */}
              {i < steps.length - 1 && (
                <span aria-hidden="true" className="md:hidden absolute left-[17px] top-10 bottom-1 w-[2px] rounded-full bg-divider">
                  <span className={`${fill} origin-top ${filledOut ? 'scale-y-100' : 'scale-y-0'}`} />
                </span>
              )}
              <span className={`relative z-[1] w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 border-2 transition-colors duration-300
                ${st === 'done' ? 'bg-ok-tint border-ok/50 text-ok' : st === 'run' ? 'bg-ai-tint border-ai text-ai pulse-ring' : st === 'error' ? 'bg-conflict-tint border-conflict text-conflict' : 'bg-surface border-border text-faint'}`}>
                {st === 'done' ? <Icon name="check" size={16} sw={2.6} /> : st === 'error' ? <Icon name="alert" size={15} /> : <Icon name={s.icon} size={16} sw={st === 'run' ? 2.1 : 1.75} />}
              </span>
              <div className={`pl-3 pb-4 md:pb-0 md:pl-0 md:pt-2.5 md:text-center md:px-1 min-w-0 ${st === 'wait' ? 'opacity-55' : ''}`}>
                <div className={`text-[13px] font-semibold ${st === 'run' ? 'text-ai-ink' : ''}`}>{s.label}</div>
                {s.detail && <div className="text-[12px] text-muted leading-[1.4] mt-0.5 md:max-w-[160px] md:mx-auto">{s.detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">{error ? `Stopped at ${live?.label}` : current >= steps.length ? 'All steps complete' : live ? `Working: ${live.label}` : ''}</p>
    </div>
  );
}
