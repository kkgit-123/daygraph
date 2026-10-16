import { arrowStyle, edgeGeometry, edgeLook, lineStyle } from '../../graph/layout';

export default function GraphEdge({ edge, a, b, selId, mini = false }) {
  const g = edgeGeometry(a, b);
  const l = edgeLook(edge, selId, mini);
  return (
    <>
      <div aria-hidden="true" className="z-[1]" style={lineStyle(g, l.color, l.h, l.dashed, l.op)} />
      {!mini && <div aria-hidden="true" className="z-[1]" style={arrowStyle(g, l.color, l.op)} />}
    </>
  );
}

export function EdgeLabel({ edge, a, b, text }) {
  const g = edgeGeometry(a, b);
  const pending = edge.conflict && edge.label === 'conflict?';
  return (
    <span aria-hidden="true"
      className={`absolute z-[3] -translate-x-1/2 -translate-y-1/2 border rounded-full px-[9px] py-0.5 text-[11.5px] font-bold whitespace-nowrap ${pending ? 'bg-conflict-tint border-conflict/35 text-conflict-ink' : 'bg-surface border-field-border text-quiet-ink'}`}
      style={{ left: (g.p.x + g.q.x) / 2, top: (g.p.y + g.q.y) / 2 }}>
      {text}
    </span>
  );
}
