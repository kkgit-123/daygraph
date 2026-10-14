import { useState } from 'react';
import PageHeader from '../Component/layout/PageHeader';
import Button from '../Component/ui/Button';
import Chip from '../Component/ui/Chip';
import Icon from '../Component/ui/Icon';
import { ErrorBox, Skeleton } from '../Component/ui/States';
import StatStrip from '../Component/today/StatStrip';
import PriorityList from '../Component/today/PriorityList';
import TaskList from '../Component/today/TaskList';
import SchedulePanel from '../Component/today/SchedulePanel';
import FocusChart from '../Component/today/FocusChart';
import GraphPanel from '../Component/today/GraphPanel';
import Scratchpad from '../Component/today/Scratchpad';
import IdeasPanel from '../Component/today/IdeasPanel';
import SavedReading from '../Component/today/SavedReading';
import DailyInsight from '../Component/today/DailyInsight';
import { useDay, useMe } from '../api/hooks';
import { dayLabel, shiftDate } from '../lib/dates';

export default function Today() {
  const { data: me, error: meError, refetch: refetchMe } = useMe();
  const [picked, setPicked] = useState(null);
  const date = picked || me?.today;
  const { data: day, isLoading, error, refetch } = useDay(date);

  const newTask = () => document.getElementById('addTaskInput')?.focus();

  const actions = date && (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" aria-label="Previous day" onClick={() => setPicked(shiftDate(date, -1))}><Icon name="chevL" size={16} sw={2.2} /></Button>
      <Chip size="s">{dayLabel(date)}</Chip>
      <Button variant="secondary" size="sm" aria-label="Next day" onClick={() => setPicked(shiftDate(date, 1))}><Icon name="chevR" size={16} sw={2.2} /></Button>
      <Button size="sm" onClick={newTask}><Icon name="plus" size={16} sw={2.4} />New task</Button>
    </div>
  );

  if (meError) return <ErrorBox error={meError} onRetry={refetchMe} />;

  return (
    <>
      <DailyInsight />
      <PageHeader title={day?.title || ' '} subtitle={day?.subtitle}>{actions}</PageHeader>
      <div className="flex flex-col gap-6">
        <StatStrip />
        {error ? <ErrorBox error={error} onRetry={refetch} /> : (
          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-6">
              {isLoading || !day ? (<><Skeleton className="h-64" /><Skeleton className="h-64" /></>) : (<><PriorityList day={day} /><TaskList day={day} /></>)}
              <Scratchpad date={date} />
              <IdeasPanel />
            </div>
            <div className="flex-[1_1_360px] max-w-[440px] min-w-0 flex flex-col gap-6">
              <GraphPanel />
              {isLoading || !day ? <Skeleton className="h-64" /> : (<><SchedulePanel day={day} /><FocusChart day={day} /></>)}
              <SavedReading />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
