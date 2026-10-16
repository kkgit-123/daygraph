import CountUp from '../Component/fx/CountUp';
import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Switch from '../Component/ui/Switch';
import { StatTiles } from '../Component/today/StatStrip';
import { ADMIN } from '../demo/specData';


export default function Admin() {
  const [pol, setPol] = useState(ADMIN.policies.map((p) => p[1]));
  return (
    <>
      <PageHeader title="Admin" subtitle="Policy, usage and cost, and data controls for your Workspace domain.">
        <Chip tone="ok" size="g">Domain: persistent.com</Chip>
      </PageHeader>
      <StatTiles stats={ADMIN.usage.map(([label, value]) => ({ label, value }))} render={(s) => (
        <><div className="text-muted text-[13px]">{s.label}</div><div className="text-[26px] leading-none font-semibold tracking-[-0.03em] tabular"><CountUp value={s.value} /></div></>
      )} />
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[1_1_420px] flex flex-col gap-6 min-w-0">
          <Panel className="p-6 flex flex-col gap-4">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Policy</h2>
            {ADMIN.policies.map(([l], i) => (
              <div key={l} className="flex items-center gap-4"><span className="flex-1 font-semibold">{l}</span>
                <Switch on={pol[i]} label={l} onChange={(v) => setPol((p) => p.map((x, j) => (j === i ? v : x)))} /></div>
            ))}
          </Panel>
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Domain allow-list</h2>
            <div className="flex flex-wrap gap-2">{ADMIN.domains.map((d) => <Chip key={d} tone="ai" size="g">{d}</Chip>)}</div>
            <p className="text-muted text-[13.5px]">Only accounts on these domains can connect Google to DayGraph.</p>
          </Panel>
        </div>
        <div className="flex-[1_1_420px] flex flex-col gap-6 min-w-0">
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Retention</h2>
            {ADMIN.retention.map(([k, v]) => <div key={k} className="flex py-2 border-t border-divider first:border-t-0"><span className="flex-1">{k}</span><span className="font-semibold">{v}</span></div>)}
          </Panel>
          <Panel className="p-6 flex flex-col gap-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Audit log</h2>
            {ADMIN.audit.map(([t, w, a]) => <div key={t + a} className="flex gap-3 py-2 border-t border-divider first:border-t-0 text-[13.5px]"><span className="w-12 text-muted">{t}</span><span className="w-28 font-semibold">{w}</span><span className="flex-1">{a}</span></div>)}
          </Panel>
        </div>
      </div>
    </>
  );
}
