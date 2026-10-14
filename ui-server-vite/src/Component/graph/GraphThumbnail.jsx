import { useNavigate } from 'react-router-dom';
import { layoutGraph } from '../../graph/layout';
import GraphEdge from './GraphEdge';
import GraphNode from './GraphNode';

export default function GraphThumbnail({ graph }) {
  const navigate = useNavigate();
  const laid = layoutGraph(graph?.nodes || [], graph?.edges || []);
  const byId = Object.fromEntries(laid.nodes.map((n) => [n.id, n]));
  return (
    <button type="button" onClick={() => navigate('/graph')} aria-label="Open the decision graph"
      className="block mt-4 w-full h-[252px] rounded-xl border border-border overflow-hidden relative bg-[#FBFBFD] bg-[radial-gradient(#D5D9E8_1px,transparent_1px)] bg-[length:16px_16px]">
      <div className="absolute left-0 top-0 pointer-events-none" style={{ width: 780, height: 610, transform: 'scale(0.4)', transformOrigin: '0 0' }}>
        {(graph?.edges || []).filter((e) => byId[e.from] && byId[e.to]).map((e) => (
          <GraphEdge key={e.id ?? `${e.from}-${e.to}`} edge={e} a={byId[e.from]} b={byId[e.to]} mini />
        ))}
        {laid.nodes.map((n) => <GraphNode key={n.id} node={n} mini />)}
      </div>
    </button>
  );
}
