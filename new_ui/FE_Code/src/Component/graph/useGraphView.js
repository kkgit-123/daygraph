import { useMemo } from 'react';
import { cmpOrder, layoutGraph } from '../../graph/layout';

export const KIND_LABEL = { topic: 'Topic', decision: 'Decision', task: 'Task', meeting: 'Meeting', person: 'Person' };
const KIND_ORDER = { topic: 0, decision: 1, task: 2, meeting: 3, person: 4 };

export const newestDecisionId = (nodes = []) => {
  const ds = nodes.filter((n) => n.kind === 'decision').sort(cmpOrder);
  return ds.length ? ds[ds.length - 1].id : null;
};

/* Lays out the full graph once, then applies kind filters and selection. */
export function useGraphView(graph, hide, selectedId) {
  return useMemo(() => {
    const nodesIn = graph?.nodes || [];
    const edgesIn = graph?.edges || [];
    const laid = layoutGraph(nodesIn, edgesIn);
    const byId = {};
    laid.nodes.forEach((n) => { byId[n.id] = n; });
    const vis = (n) => !hide[n.kind];
    const nodes = laid.nodes.filter(vis).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
    const edges = edgesIn.filter((e) => byId[e.from] && byId[e.to] && vis(byId[e.from]) && vis(byId[e.to]));
    let sel = selectedId;
    if (!sel || !byId[sel] || !vis(byId[sel])) sel = newestDecisionId(nodesIn);
    const nbr = new Set(sel ? [sel] : []);
    edges.forEach((e) => { if (e.from === sel || e.to === sel) { nbr.add(e.from); nbr.add(e.to); } });
    return { W: laid.W, H: laid.H, nodes, edges, byId, sel, nbr };
  }, [graph, hide, selectedId]);
}
