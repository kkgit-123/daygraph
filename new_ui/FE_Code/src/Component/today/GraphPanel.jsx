import { useNavigate } from 'react-router-dom';
import { useGraph } from '../../api/hooks';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import Panel, { PanelHeader } from '../ui/Panel';
import GraphThumbnail from '../graph/GraphThumbnail';
import { Skeleton } from '../ui/States';

export default function GraphPanel() {
  const navigate = useNavigate();
  const { data, isLoading } = useGraph();
  const open = data?.stats?.openConflicts || 0;
  return (
    <Panel className="p-5 sm:p-6 overflow-hidden stagger" style={{ '--i': 3 }}>
      <PanelHeader icon={<Icon name="graph" size={16} />} iconTone="ai" title="Your decision graph" subtitle="How decisions, meetings, tasks and people connect.">
        <Button variant="secondary" size="sm" onClick={() => navigate('/graph')}>Open<Icon name="arrowR" size={14} /></Button>
      </PanelHeader>
      {isLoading ? <Skeleton className="h-[220px] mt-4" /> : <GraphThumbnail graph={data} />}
      <div className="mt-3.5 flex flex-wrap gap-2 items-center">
        {data?.stats && <Chip>{data.stats.decisions} decisions</Chip>}
        <Chip tone={open ? 'conflict' : 'ok'}>{open ? `${open} ${open === 1 ? 'conflict' : 'conflicts'} to review` : 'No open conflicts'}</Chip>
      </div>
    </Panel>
  );
}
