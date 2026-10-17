import CountUp from '../Component/fx/CountUp';
import { useEffect, useRef, useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import Chip from '../Component/ui/Chip';
import Button from '../Component/ui/Button';
import Avatar from '../Component/ui/Avatar';
import Icon from '../Component/ui/Icon';
import { MANAGER, PEOPLE } from '../demo/specData';
import { StatTiles } from '../Component/today/StatStrip';

const TONE = { ok: 'text-ok-ink', conflict: 'text-conflict-ink', warn: 'text-warn-ink' };
const STAGES = ['Reading shared decisions and tasks', 'Gemini Pro writing the brief', 'Creating Google Doc in Drive'];

export default function Manager() {
  const [stage, setStage] = useState(-1);
  const t = useRef([]);
  useEffect(() => () => t.current.forEach(clearTimeout), []);
  const gen = () => { setStage(0); t.current = [1, 2, 3].map((i) => setTimeout(() => setStage(i), i * 1100)); };
  const done = stage >= STAGES.length;
  return (
    <>
      <PageHeader title="Manager dashboard" subtitle="Payments launch · week of 6 Oct. Only items people chose to share. Private notes never appear.">
        <Button variant="ai" onClick={gen} disabled={stage >= 0 && !done}><Icon name="spark" size={15} />Generate decision brief</Button>
      </PageHeader>
      <StatTiles stats={MANAGER.stats.map(([label, value, note, tone]) => ({ label, value, note, tone }))} render={(s) => (
        <>
          <div className="text-muted text-[13px]">{s.label}</div>
          <div className="text-[28px] leading-none font-semibold tracking-[-0.03em] tabular"><CountUp value={s.value} /></div>
          <div className={`text-[12.5px] font-semibold ${TONE[s.tone]}`}>{s.note}</div>
        </>
      )} />
      {stage >= 0 && (
        <Panel className="p-6 flex flex-col gap-3">
          {!done ? STAGES.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 ${i > stage ? 'opacity-35' : ''}`}>
              {i < stage ? <Icon name="check" size={18} className="text-ok" sw={2.5} /> : <Icon name="refresh" size={18} className={i === stage ? 'animate-spin' : ''} />}<span className="font-semibold">{s}</span>
            </div>
          )) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="flex-1 text-[16px] font-semibold tracking-[-0.01em]">Decision brief · 13 Oct</h2>
                <Chip tone="ok"><Icon name="check" size={14} sw={2.5} />Exported to Google Docs</Chip>
                <span className="text-accent-ink font-semibold text-[13.5px] underline">Drive / Payments launch / Decision brief 13 Oct</span>
              </div>
              <ul className="flex flex-col gap-2 list-disc pl-5 leading-[1.55]">{MANAGER.brief.map((b) => <li key={b}>{b}</li>)}</ul>
            </>
          )}
        </Panel>
      )}
      <div className="flex flex-wrap gap-6 items-start">
        <Panel className="flex-[1_1_380px] p-6 flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Blockers and stalled work</h2>
          {MANAGER.blockers.map((b) => (
            <div key={b.title} className="flex gap-3 py-3 border-t border-divider first:border-t-0">
              <Avatar initials={b.owner} bg={PEOPLE[b.owner].bg} color={PEOPLE[b.owner].color} size={30} />
              <div className="flex-1"><div className="font-semibold">{b.title}</div><div className="text-muted text-[13.5px]">{b.note}</div></div>
              <Chip tone="warn">{b.age}</Chip>
            </div>
          ))}
        </Panel>
        <Panel className="flex-[1_1_380px] p-6 flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Members</h2>
          {MANAGER.members.map(([i, n, d, o, s]) => (
            <div key={i} className="flex items-center gap-3 py-3 border-t border-divider first:border-t-0">
              <Avatar initials={i} bg={PEOPLE[i].bg} color={PEOPLE[i].color} size={30} />
              <div className="flex-1"><div className="font-semibold">{n}</div><div className="text-muted text-[13px]">{d} done, {o} open</div></div>
              <Chip tone={o ? 'warn' : 'ok'}>{s}</Chip>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
