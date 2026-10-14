import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel from '../ui/Panel';
import { DAILY_INSIGHT } from '../../demo/insightData';

/* Mock of the daily discovery agent (Part B). Data is hardcoded; no network call is made. */
export default function DailyInsight() {
  const i = DAILY_INSIGHT;
  return (
    <Panel as="aside" aria-label="Today's learning pick" className="p-5 flex flex-col gap-3 bg-gradient-to-r from-accent-tint to-white">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="w-8 h-8 rounded-[9px] bg-accent text-white inline-flex items-center justify-center"><Icon name="spark" size={17} /></span>
        <span className="font-bold text-[15px]">Today's learning pick</span>
        <Chip tone="ai">{i.kind}</Chip>
        <span className="text-muted text-[12.5px]">{i.date} · scanned 118 sources · 7:00 daily run</span>
      </div>
      <a href={i.url} target="_blank" rel="noreferrer" onClick={(e) => e.preventDefault()}
        className="font-bold text-[16px] text-accent-ink hover:underline leading-[1.35]">{i.title}</a>
      <p className="text-[14px] leading-[1.55]">{i.summary}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
        <span><b className="text-ink">Why for you:</b> {i.why}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted border-t border-divider pt-3">
        <Icon name="info" size={14} />
        <span>Inspired by Google Research's <i>Towards an AI co-scientist</i> (2025): a multi-agent system that generates, debates and ranks hypotheses, then keeps every claim tied to a source.</span>
      </div>
    </Panel>
  );
}
