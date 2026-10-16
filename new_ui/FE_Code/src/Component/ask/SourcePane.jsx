import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel from '../ui/Panel';
import Quote from '../ui/Quote';
import { useSource } from '../../api/hooks';
import { useUi } from '../../context/contexts';

export default function SourcePane({ citation }) {
  const { flash } = useUi();
  const { data } = useSource(citation?.refId, citation);
  const src = data || citation;
  return (
    <Panel as="aside" aria-label="Source" className="min-w-0 p-5 sm:p-6 flex flex-col gap-4 lg:sticky lg:top-24">
      {!src ? (
        <>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[9px] bg-accent-tint text-accent inline-flex items-center justify-center"><Icon name="link" size={16} /></span>
            <h2 className="text-[15.5px] font-semibold">Source</h2>
          </div>
          <p className="text-muted leading-[1.6] text-[13.5px]">Select a numbered citation to see the exact passage it came from, and why you can see it.</p>
          <div className="px-4 py-3.5 rounded-xl bg-surface-2 border border-border text-[13px] leading-[1.55] flex gap-2.5">
            <Icon name="shield" size={16} className="text-ok mt-0.5" />
            <span>DayGraph only searches what you can already open in Google Workspace. Notes, ideas and saved links are visible only to you.</span>
          </div>
        </>
      ) : (
        <div key={src.title} className="flex flex-col gap-4 animate-rise">
          <div><Chip tone="accent">{src.typeLabel}</Chip></div>
          <h2 className="text-[18px] leading-[1.35] font-semibold tracking-[-0.01em]">{src.title}</h2>
          <div className="text-muted text-[13px]">{src.meta}</div>
          <div className="px-5 py-4 rounded-xl bg-surface-2 border-l-[3px] border-accent flex flex-col gap-3">
            <Quote kind={src.passageClass}>{src.passage}</Quote>
            {src.translation && <Quote kind="q-tr">{src.translation}</Quote>}
          </div>
          <div className="flex gap-2.5 items-start text-[13px] leading-normal text-quiet-ink">
            <Icon name="shield" size={17} sw={2} className="text-ok mt-px" />
            <span>{src.accessNote}</span>
          </div>
          {src.cta && <Button variant="secondary" className="self-start" onClick={() => flash('This part of the product is not in the prototype.')}><Icon name="external" size={14} />{src.cta}</Button>}
        </div>
      )}
    </Panel>
  );
}
