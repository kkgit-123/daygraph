import { useNavigate } from 'react-router-dom';
import PageHeader from '../Component/layout/PageHeader';
import Chip from '../Component/ui/Chip';
import Panel from '../Component/ui/Panel';
import { ErrorBox, Skeleton } from '../Component/ui/States';
import GraphCanvas from '../Component/graph/GraphCanvas';
import GraphDetail from '../Component/graph/GraphDetail';
import { newestDecisionId, useGraphView } from '../Component/graph/useGraphView';
import { useAskFlow, useGraph } from '../api/hooks';
import { useUi } from '../context/contexts';

const LEGEND = [
  ['w-[18px] h-3 rounded border-[1.5px] border-ok bg-white', 'Active decision'],
  ['w-[18px] h-3 rounded border-[1.5px] border-dashed border-[#9AA1BC] bg-[#F7F8FC]', 'Replaced decision'],
  ['w-[18px] h-3 rounded border-2 border-conflict bg-[#FEF7F5]', 'Waiting for review'],
  ['w-[18px] h-3 rounded border-[1.5px] border-[#C3C9F4] bg-accent-tint', 'Meeting'],
  ['w-[18px] h-3 rounded-full border-[1.5px] border-[#9DD8BE] bg-ok-tint', 'Task'],
];

export default function Graph() {
  const navigate = useNavigate();
  const { graphSel, setGraphSel, hide, toggleHide, edgeLabels, setEdgeLabels } = useUi();
  const { data, isLoading, error, refetch } = useGraph();
  const view = useGraphView(data, hide, graphSel);
  const run = useAskFlow();
  const open = data?.stats?.openConflicts || 0;

  /* hiding the kind of the selected node moves the selection to the newest decision */
  const toggleKind = (k) => {
    if (!hide[k] && view.byId[view.sel]?.kind === k) setGraphSel(newestDecisionId(data?.nodes));
    toggleHide(k);
  };

  const askWhy = () => {
    run('Why did we change the launch date?');
    navigate('/ask');
  };

  const stats = data?.stats && (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip size="g">{data.stats.decisions} decisions</Chip>
      <Chip size="g">{data.stats.links} links</Chip>
      <Chip size="g" tone={open ? 'conflict' : 'ok'}>{open ? `${open} ${open === 1 ? 'conflict' : 'conflicts'} to review` : 'No open conflicts'}</Chip>
    </div>
  );

  return (
    <>
      <PageHeader title="Decision graph" subtitle="Every decision, meeting, task and person, and how they connect. Select anything to follow its links.">{stats}</PageHeader>
      {error ? <ErrorBox error={error} onRetry={refetch} /> : isLoading ? <Skeleton className="h-[610px]" /> : (
        <div className="flex flex-wrap gap-6 items-start">
          <Panel className="flex-[999_1_760px] min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2.5 px-5 py-3.5 border-b border-divider">
              <span className="text-muted text-[13.5px] mr-1">Show</span>
              <Chip tone="picked" size="f">Decisions</Chip>
              {[['meeting', 'Meetings'], ['task', 'Tasks'], ['person', 'People']].map(([k, label]) => (
                <Chip key={k} size="f" tone={hide[k] ? 'pick' : 'picked'} aria-pressed={!hide[k]} onClick={() => toggleKind(k)}>{label}</Chip>
              ))}
              <span className="flex-1" />
              <Chip size="f" tone={edgeLabels ? 'picked' : 'pick'} aria-pressed={edgeLabels} onClick={() => setEdgeLabels(!edgeLabels)}>Relationship names</Chip>
            </div>
            <GraphCanvas view={view} edgeLabels={edgeLabels} onSelect={setGraphSel} />
            <div className="flex flex-wrap gap-x-6 gap-y-3 items-center px-5 py-3.5 border-t border-divider text-[13px]">
              {LEGEND.map(([box, text]) => (
                <span key={text} className="inline-flex items-center gap-2"><span className={box} />{text}</span>
              ))}
              <span className="text-muted">Dashed red link: possible conflict</span>
            </div>
          </Panel>
          <GraphDetail view={view} onSelect={setGraphSel} onAskWhy={askWhy} />
        </div>
      )}
    </>
  );
}
