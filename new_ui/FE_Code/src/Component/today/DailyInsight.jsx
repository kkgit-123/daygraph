import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';
import { DAILY_INSIGHT } from '../../demo/insightData';

/* Mock of the daily discovery agent (Part B). Data is hardcoded; no network call is made. */
export default function DailyInsight() {
  const i = DAILY_INSIGHT;
  return (
    <Panel as="aside" aria-label="Today's learning pick" className="p-5 sm:p-6 flex flex-col gap-3 stagger" style={{ '--i': 5 }}>
      <PanelHeader icon={<Icon name="compass" size={16} />} iconTone="ai" title="Today's learning pick" subtitle={`${i.date} · scanned 118 sources · 7:00 daily run`}>
        <Chip tone="ai">{i.kind}</Chip>
        <Chip tone="quiet" title="Hardcoded sample output of the discovery agent">Sample</Chip>
      </PanelHeader>
      <a href={i.url} target="_blank" rel="noreferrer" onClick={(e) => e.preventDefault()}
        className="font-semibold text-[15px] text-ink hover:text-accent transition-colors leading-[1.4]">{i.title}</a>
      <p className="text-[13.5px] leading-[1.6] text-quiet-ink">{i.summary}</p>
      <div className="rounded-xl bg-ai-tint px-3.5 py-2.5 text-[13px] leading-[1.5]"><b className="text-ai-ink">Why for you:</b> {i.why}</div>
      <div className="flex gap-2 text-[12px] text-muted pt-1">
        <Icon name="info" size={14} className="mt-0.5" />
        <span>Inspired by Google Research's <i>Towards an AI co-scientist</i> (2025): a multi-agent system that generates, debates and ranks hypotheses, then keeps every claim tied to a source.</span>
      </div>
    </Panel>
  );
}
