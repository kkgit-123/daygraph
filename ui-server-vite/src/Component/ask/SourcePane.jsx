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
    <Panel as="aside" className="flex-[1_1_320px] max-w-[420px] min-w-0 pt-[26px] px-[26px] pb-7 flex flex-col gap-4">
      {!src ? (
        <>
          <h2 className="text-[17px] font-bold">Source</h2>
          <p className="text-muted leading-[1.55]">Select a numbered citation to see the exact passage it came from, and why you can see it.</p>
          <div className="px-4 py-3.5 rounded-[10px] bg-[#F5F6FB] text-[13.5px] leading-normal">
            DayGraph only searches what you can already open in Google Workspace. Notes, ideas and saved links are visible only to you.
          </div>
        </>
      ) : (
        <>
          <div><Chip>{src.typeLabel}</Chip></div>
          <h2 className="text-[19px] leading-[1.3] font-bold">{src.title}</h2>
          <div className="text-muted text-[13.5px]">{src.meta}</div>
          <div className="px-5 py-[18px] rounded-xl bg-[#F5F6FB] flex flex-col gap-3">
            <Quote kind={src.passageClass}>{src.passage}</Quote>
            {src.translation && <Quote kind="q-tr">{src.translation}</Quote>}
          </div>
          <div className="flex gap-2.5 items-start text-[13.5px] leading-normal">
            <span className="mt-px"><Icon name="shield" size={18} sw={2} color="#0D6148" /></span>
            <span>{src.accessNote}</span>
          </div>
          {src.cta && <Button variant="secondary" className="self-start" onClick={() => flash('This part of the product is not in the prototype.')}>{src.cta}</Button>}
        </>
      )}
    </Panel>
  );
}
