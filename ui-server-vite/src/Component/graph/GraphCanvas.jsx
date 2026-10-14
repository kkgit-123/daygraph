import { REL } from '../../graph/layout';
import GraphEdge, { EdgeLabel } from './GraphEdge';
import GraphNode from './GraphNode';

export default function GraphCanvas({ view, edgeLabels, onSelect }) {
  const { W, H, nodes, edges, byId, sel, nbr } = view;
  return (
    <div className="overflow-x-auto bg-[#FBFBFD] bg-[radial-gradient(#D5D9E8_1px,transparent_1px)] bg-[length:22px_22px]">
      <div className="relative mx-auto" style={{ width: W, height: H }}>
        {edges.map((e) => <GraphEdge key={e.id ?? `${e.from}-${e.to}-${e.type}`} edge={e} a={byId[e.from]} b={byId[e.to]} selId={sel} />)}
        {nodes.map((n) => (
          <GraphNode key={n.id} node={n} selected={n.id === sel} dim={!nbr.has(n.id)} onSelect={onSelect} />
        ))}
        {edges.filter((e) => edgeLabels || e.type === 'supersedes').map((e) => (
          <EdgeLabel key={`l-${e.id ?? `${e.from}-${e.to}`}`} edge={e} a={byId[e.from]} b={byId[e.to]}
            text={e.label || REL[e.type]?.text || e.type} />
        ))}
      </div>
    </div>
  );
}
