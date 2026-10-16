import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Icon from '../Component/ui/Icon';
import { BQ_WEEKS, PIPELINE, SERVICES } from '../demo/googleData';

function ServiceCard({ s }) {
  const [state, setState] = useState('idle');
  const sync = () => { setState('syncing'); setTimeout(() => setState('done'), 1600); };
  return (
    <Panel className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-[10px] text-white font-bold text-[15px] inline-flex items-center justify-center shrink-0" style={{ background: s.color }}>{s.name[0]}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{s.name}</div>
          <div className="text-muted text-[13px]">{s.tag}</div>
        </div>
        <Chip tone="ok"><span className="w-1.5 h-1.5 rounded-full bg-ok" />Connected</Chip>
      </div>
      <p className="text-[13.5px] text-muted leading-[1.5]">{s.detail}</p>
      <div className="flex items-center gap-3 mt-auto">
        <span className="flex-1 font-semibold text-[13.5px]">{state === 'done' ? 'Synced just now' : s.count}</span>
        <Button variant="secondary" size="sm" disabled={state === 'syncing'} onClick={sync}>
          <Icon name="refresh" size={15} className={state === 'syncing' ? 'animate-spin' : ''} />{state === 'syncing' ? 'Syncing' : 'Sync now'}
        </Button>
      </div>
    </Panel>
  );
}

export default function Google() {
  const max = Math.max(...BQ_WEEKS.map((b) => b.hours));
  return (
    <>
      <PageHeader title="Google Cloud" subtitle="Every Google service DayGraph uses, and how data flows between them.">
        <Chip tone="ok" size="g"><Icon name="shield" size={15} />Permissions inherited from Workspace</Chip>
      </PageHeader>

      <Panel className="p-6 flex flex-col gap-4">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">How a meeting becomes a decision</h2>
        <div className="flex flex-wrap items-stretch gap-2">
          {PIPELINE.map((p, i) => (
            <div key={p.title} className="flex items-center gap-2 flex-[1_1_170px]">
              <div className="flex-1 rounded-xl bg-accent-tint p-4 h-full">
                <div className="text-accent-ink font-bold mb-2">{p.title}</div>
                <ul className="flex flex-col gap-1 text-[13.5px]">{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
              {i < PIPELINE.length - 1 && <Icon name="chevR" size={20} className="text-accent" />}
            </div>
          ))}
        </div>
      </Panel>

      {['Workspace', 'Google Cloud'].map((g) => (
        <section key={g} className="flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{g}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {SERVICES.filter((s) => s.group === g).map((s) => <ServiceCard key={s.id} s={s} />)}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-6 items-start">
        <Panel className="flex-[1_1_420px] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 text-[16px] font-semibold tracking-[-0.01em]">Decision cycle time <span className="text-muted font-normal text-[14px]">· BigQuery</span></h2>
            <Chip tone="ok">-73% in 6 weeks</Chip>
          </div>
          <div className="flex items-end gap-3 h-[150px]" role="img" aria-label="Hours from meeting to confirmed decision, falling from 52 to 14 over six weeks">
            {BQ_WEEKS.map((b) => (
              <div key={b.w} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <span className="text-[12.5px] font-semibold">{b.hours}h</span>
                <div className="w-full rounded-t-md bg-accent" style={{ height: `${(b.hours / max) * 100}%` }} />
                <span className="text-muted text-[12.5px]">{b.w}</span>
              </div>
            ))}
          </div>
          <p className="text-muted text-[13px]">Median hours from a meeting ending to its decisions being reviewed and confirmed.</p>
        </Panel>

        <Panel className="flex-[1_1_320px] p-6 flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Deployment <span className="text-muted font-normal text-[14px]">· Cloud Run</span></h2>
          {[['Region', 'asia-south1 (Mumbai)'], ['Service', 'daygraph-api, daygraph-web'], ['Revision', 'daygraph-00042, 100% traffic'], ['Auth', 'IAP + Workspace SSO'], ['Secrets', 'Secret Manager'], ['Scale', '0 to 20 instances']].map(([k, v]) => (
            <div key={k} className="flex gap-3 py-2 border-t border-divider first:border-t-0">
              <span className="w-24 text-muted">{k}</span><span className="flex-1 font-semibold">{v}</span>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
