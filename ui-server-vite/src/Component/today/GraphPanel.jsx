import { useNavigate } from 'react-router-dom';
import { useGraph } from '../../api/hooks';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Panel from '../ui/Panel';
import GraphThumbnail from '../graph/GraphThumbnail';
import { Skeleton } from '../ui/States';

export default function GraphPanel() {
  const navigate = useNavigate();
  const { data, isLoading } = useGraph();
  const open = data?.stats?.openConflicts || 0;
  return (
    <Panel className="pt-[22px] px-[22px] pb-5 overflow-hidden">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[19px] font-bold flex-1">Your decision graph</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/graph')}>Open graph</Button>
      </div>
      <p className="text-muted mt-1 text-[13.5px]">How decisions, meetings, tasks and people connect.</p>
      {isLoading ? <Skeleton className="h-[252px] mt-4" /> : <GraphThumbnail graph={data} />}
      <div className="mt-3.5 flex flex-wrap gap-2 items-center">
        {data?.stats && <Chip>{data.stats.decisions} decisions</Chip>}
        <Chip tone={open ? 'conflict' : 'ok'}>{open ? `${open} ${open === 1 ? 'conflict' : 'conflicts'} to review` : 'No open conflicts'}</Chip>
      </div>
    </Panel>
  );
}
