import Icon from '../ui/Icon';
import { initialsOf, colorsFor } from '../../lib/people';
import { KIND_LABEL } from './useGraphView';

const RING = 'shadow-[0_0_0_4px_rgba(53,64,211,.28)]';

const decisionBox = {
  active: 'border-[1.5px] border-ok bg-white',
  superseded: 'border-[1.5px] border-dashed border-[#9AA1BC] bg-[#F7F8FC]',
  dismissed: 'border-[1.5px] border-dashed border-[#9AA1BC] bg-[#F7F8FC]',
  pending: 'border-2 border-conflict bg-[#FEF7F5]',
};
const taskBox = {
  done: 'border-[#9DD8BE] bg-ok-tint text-ok-ink border-[1.5px]',
  open: 'border-[#C3C9F4] bg-accent-tint text-[#232B94] border-[1.5px]',
  planned: 'border-dashed border-[#9AA1BC] bg-white text-muted border-[1.5px]',
};

function personBg(n) {
  return n.bg || colorsFor(initialsOf(n.fullTitle || n.title)).bg;
}

/* mini = thumbnail variant: no icons, ring, dimming or interaction */
export default function GraphNode({ node: n, selected, dim, onSelect, mini = false }) {
  const isP = n.kind === 'person';
  const w = isP ? 44 : n.w, h = isP ? 44 : n.h;
  const style = { left: n.x - w / 2, top: n.y - h / 2, width: w, height: h };
  const fade = dim ? 'opacity-40' : '';
  const ring = !mini && selected ? RING : '';
  const base = 'absolute flex transition-opacity duration-150 ' + (mini ? '' : 'hover:brightness-[.98] ') + fade + ' ';
  let cls, label, icon = null, sub = null;

  if (n.kind === 'topic') {
    cls = `bg-rail rounded-full gap-2 px-4 justify-center items-center ${ring}`;
    label = <span className="block font-bold text-[14px] text-white whitespace-nowrap">{n.title}</span>;
    if (!mini) icon = <Icon name="tag" size={16} sw={2} color="#fff" />;
  } else if (n.kind === 'decision') {
    const muted = n.state === 'superseded' || n.state === 'dismissed';
    cls = `flex-col items-start justify-center px-3 py-2 rounded-xl ${decisionBox[n.state] || decisionBox.active} ${ring}`;
    label = <span className={`block font-bold text-[13px] leading-[1.25] ${muted ? 'text-muted' : 'text-ink'}`}>{n.title}</span>;
    const subColor = n.state === 'pending' ? 'text-conflict-ink' : n.state === 'active' ? 'text-ok-ink' : 'text-muted';
    if (n.subtitle) sub = <span className={`block text-xs mt-[3px] font-semibold ${subColor}`}>{n.subtitle}</span>;
  } else if (n.kind === 'meeting') {
    cls = `items-center gap-2 px-3 rounded-xl border-[1.5px] border-[#C3C9F4] bg-accent-tint ${ring}`;
    label = <span className="block font-semibold text-[12.5px] leading-[1.25] text-[#232B94]">{n.title}</span>;
    if (!mini) icon = <Icon name="video" size={16} sw={2} color="#232B94" />;
  } else if (n.kind === 'task') {
    cls = `items-center gap-1.5 px-3.5 rounded-full justify-center ${taskBox[n.state] || taskBox.open} ${ring}`;
    label = <span className="block font-semibold text-[12.5px] whitespace-nowrap">{n.title}</span>;
    if (!mini) icon = <Icon name="check" size={14} sw={3} />;
  } else {
    cls = `items-center justify-center rounded-full border-2 border-white ${ring || (mini ? '' : 'shadow-[0_1px_3px_rgba(23,26,43,.2)]')}`;
    style.background = personBg(n);
    label = <span className="block font-bold text-[13px] text-ink">{initialsOf(n.fullTitle || n.title)}</span>;
  }

  if (mini) {
    return <div className={`${base}${cls}`} style={style}>{label}</div>;
  }
  return (
    <>
      <button type="button" aria-label={`${KIND_LABEL[n.kind]}: ${n.fullTitle || n.title}`} aria-pressed={selected}
        onClick={() => onSelect(n.id)} className={`${base}z-[2] cursor-pointer ${cls}`} style={style}>
        {icon}{label}{sub}
      </button>
      {isP && (
        <span className={`absolute z-[2] w-[68px] text-center text-[12.5px] font-semibold text-quiet-ink transition-opacity duration-150 ${fade}`}
          style={{ left: n.x - 34, top: n.y + 27 }}>
          {(n.fullTitle || n.title).split(' ')[0]}
        </span>
      )}
    </>
  );
}
