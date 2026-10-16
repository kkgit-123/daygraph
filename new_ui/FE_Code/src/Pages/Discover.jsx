import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Icon from '../Component/ui/Icon';
import { DISCOVER } from '../demo/specData';
import { useUi } from '../context/contexts';

export default function Discover() {
  const { flash } = useUi();
  const [state, setState] = useState({});
  const set = (i, v, msg) => { setState((s) => ({ ...s, [i]: v })); if (msg) flash(msg); };
  return (
    <>
      <PageHeader title="Discover" subtitle="A morning digest of releases, research and tools matched to what you are building. Every item is fetched and verified.">
        <Chip tone="ai" size="g"><Icon name="search" size={15} />Gemini with Google Search grounding</Chip>
      </PageHeader>
      <Panel className="p-5 flex flex-wrap gap-x-8 gap-y-2 text-[13.5px] text-muted">
        <span><b className="text-ink">Delivery</b> 07:00 weekdays</span><span><b className="text-ink">Sources</b> Search, RSS, Hacker News, arXiv, GitHub</span>
        <span><b className="text-ink">Freshness</b> 7 days</span><span><b className="text-ink">Today</b> 118 candidates, 25 judged, 5 shown</span>
      </Panel>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-4">
        {DISCOVER.map((d, i) => (
          <Panel key={d.title} className={`p-5 flex flex-col gap-3 ${state[i] === 'dismissed' ? 'opacity-40' : ''}`}>
            <div className="flex items-center gap-2"><Chip tone="ai">{d.kind}</Chip><span className="text-muted text-[12.5px]">{d.src} · {d.date}</span></div>
            <h3 className="font-bold text-[16px] leading-[1.35]">{d.title}</h3>
            <p className="text-[13.5px] leading-[1.5]"><b>Why for you:</b> {d.why}</p>
            {d.link && <Chip tone="quiet" className="self-start"><Icon name="link" size={13} />{d.link}</Chip>}
            <div className="flex flex-wrap gap-2 mt-auto">
              <Button size="sm" variant={state[i] === 'saved' ? 'secondary' : 'primary'} onClick={() => set(i, 'saved', 'Saved to reading vault. Summary will appear shortly.')}>{state[i] === 'saved' ? 'Saved' : 'Save to vault'}</Button>
              <Button size="sm" variant="secondary" onClick={() => flash('Added to Ideas.')}><Icon name="bulb" size={14} />Make idea</Button>
              <Button size="sm" variant="ghost" onClick={() => set(i, 'dismissed', 'Dismissed. Fewer items like this.')}>Not for me</Button>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
