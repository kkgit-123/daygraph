import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import { ADMIN } from '../demo/specData';

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`w-9 h-5 rounded-full relative inline-block shrink-0 transition-colors duration-150 ${on ? 'bg-ok' : 'bg-[#9AA1BC]'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-150 ${on ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

export default function Admin() {
  const [pol, setPol] = useState(ADMIN.policies.map((p) => p[1]));
  return (
    <>
      <PageHeader title="Admin" subtitle="Policy, usage and cost, and data controls for your Workspace domain.">
        <Chip tone="ok" size="g">Domain: persistent.com</Chip>
      </PageHeader>
      <Panel className="flex flex-wrap overflow-hidden">
        {ADMIN.usage.map(([l, v]) => (
          <div key={l} className="flex-[1_1_180px] px-[26px] py-5 flex flex-col gap-2 border-r border-divider last:border-r-0">
            <div className="text-muted text-[13.5px]">{l}</div><div className="text-[28px] leading-none font-bold">{v}</div>
          </div>
        ))}
      </Panel>
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[1_1_420px] flex flex-col gap-6 min-w-0">
          <Panel className="p-6 flex flex-col gap-4">
            <h2 className="text-[19px] font-bold">Policy</h2>
            {ADMIN.policies.map(([l], i) => (
              <div key={l} className="flex items-center gap-4"><span className="flex-1 font-semibold">{l}</span>
                <Switch on={pol[i]} label={l} onChange={(v) => setPol((p) => p.map((x, j) => (j === i ? v : x)))} /></div>
            ))}
          </Panel>
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[19px] font-bold">Domain allow-list</h2>
            <div className="flex flex-wrap gap-2">{ADMIN.domains.map((d) => <Chip key={d} tone="ai" size="g">{d}</Chip>)}</div>
            <p className="text-muted text-[13.5px]">Only accounts on these domains can connect Google to DayGraph.</p>
          </Panel>
        </div>
        <div className="flex-[1_1_420px] flex flex-col gap-6 min-w-0">
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[19px] font-bold">Retention</h2>
            {ADMIN.retention.map(([k, v]) => <div key={k} className="flex py-2 border-t border-divider first:border-t-0"><span className="flex-1">{k}</span><span className="font-semibold">{v}</span></div>)}
          </Panel>
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[19px] font-bold">Audit log</h2>
            {ADMIN.audit.map(([t, w, a]) => <div key={t + a} className="flex gap-3 py-2 border-t border-divider first:border-t-0 text-[13.5px]"><span className="w-12 text-muted">{t}</span><span className="w-28 font-semibold">{w}</span><span className="flex-1">{a}</span></div>)}
          </Panel>
        </div>
      </div>
    </>
  );
}
