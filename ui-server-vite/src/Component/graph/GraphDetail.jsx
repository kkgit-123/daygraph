import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Panel from '../ui/Panel';
import Quote from '../ui/Quote';
import { REL } from '../../graph/layout';
import { KIND_LABEL } from './useGraphView';

const CHIPS = {
  active: ['Active', 'ok'], superseded: ['Replaced', 'quiet'], pending: ['Waiting for your review', 'warn'],
  dismissed: ['Dismissed', 'quiet'], done: ['Done', 'ok'], open: ['Open', 'ai'], planned: ['Not created yet', 'quiet'],
};

export default function GraphDetail({ view, onSelect, onAskWhy }) {
  const n = view.byId[view.sel];
  if (!n) return null;
  const neighbours = view.edges.filter((e) => e.from === n.id || e.to === n.id).map((e) => {
    const out = e.from === n.id;
    const other = view.byId[out ? e.to : e.from];
    const rel = REL[e.type] || { fwd: e.type, back: e.type };
    return { key: e.id ?? `${e.from}-${e.to}`, rel: out ? rel.fwd : rel.back, title: other.fullTitle || other.title, id: other.id };
  });
  const chip = CHIPS[n.state];
  return (
    <Panel as="aside" className="flex-[1_1_300px] max-w-[380px] min-w-0 p-[26px] flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip>{KIND_LABEL[n.kind]}</Chip>
        {chip && <Chip tone={chip[1]}>{chip[0]}</Chip>}
      </div>
      <h2 className="text-[22px] leading-[1.3] font-bold tracking-[-0.01em]">{n.fullTitle || n.title}</h2>
      {n.meta && <div className="text-muted text-[13.5px]">{n.meta}</div>}
      {n.quote && (
        <div className="px-[18px] py-4 rounded-xl bg-[#F5F6FB] flex flex-col gap-2.5">
          <Quote kind={n.quoteClass}>{n.quote}</Quote>
          {n.translation && <Quote kind="q-tr">{n.translation}</Quote>}
        </div>
      )}
      <div>
        <div className="font-bold text-[15px]">Connected to</div>
        <ul className="mt-1.5">
          {neighbours.map((x) => (
            <li key={x.key} className="border-t border-divider">
              <button type="button" onClick={() => onSelect(x.id)} className="flex flex-col gap-0.5 w-full py-[11px]">
                <span className="text-muted text-[12.5px]">{x.rel}</span>
                <span className="font-semibold leading-[1.35]">{x.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {n.kind === 'decision' && <Button onClick={onAskWhy}>Ask why the date changed</Button>}
      <div className="px-4 py-3.5 rounded-[10px] bg-[#F5F6FB] text-[13.5px] leading-[1.55]">
        <span className="font-bold">Why a graph?</span> A conflict is found by following the links between decisions on the same topic, not by matching keywords.
      </div>
    </Panel>
  );
}
