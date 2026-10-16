import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorBox, Skeleton } from '../Component/ui/States';
import DailyBriefing from '../Component/today/DailyBriefing';
import FocusCard from '../Component/today/FocusCard';
import StatStrip from '../Component/today/StatStrip';
import PriorityList from '../Component/today/PriorityList';
import TaskList from '../Component/today/TaskList';
import DailyTimeline from '../Component/today/DailyTimeline';
import FocusChart from '../Component/today/FocusChart';
import GraphPanel from '../Component/today/GraphPanel';
import Scratchpad from '../Component/today/Scratchpad';
import IdeasPanel from '../Component/today/IdeasPanel';
import SavedReading from '../Component/today/SavedReading';
import DailyInsight from '../Component/today/DailyInsight';
import { useDay, useMe } from '../api/hooks';
import { shiftDate } from '../lib/dates';

export default function Today() {
  const { data: me, error: meError, refetch: refetchMe } = useMe();
  const [picked, setPicked] = useState(null);
  const [highlight, setHighlight] = useState(false);
  const focusRef = useRef(null);
  const location = useLocation();
  const date = picked || me?.today;
  const { data: day, isLoading, error, refetch } = useDay(date);
  const ready = !isLoading && !!day;

  /* "New task" from the top bar or command palette lands here and focuses the add-task field */
  const addTask = location.state?.addTask;
  useEffect(() => {
    if (!addTask || !ready) return;
    const el = document.getElementById('addTaskInput');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  }, [addTask, ready]);

  const focusNext = () => {
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusRef.current?.focus({ preventScroll: true });
    setHighlight(true);
    setTimeout(() => setHighlight(false), 1800);
  };

  if (meError) return <ErrorBox error={meError} onRetry={refetchMe} />;

  return (
    <>
      {date
        ? <DailyBriefing day={day} me={me} date={date} onShift={(n) => setPicked(shiftDate(date, n))} onToday={() => setPicked(null)} onFocusNext={focusNext} />
        : <Skeleton className="h-[240px]" />}
      <StatStrip />
      {error ? <ErrorBox error={error} onRetry={refetch} /> : (
        <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 flex flex-col gap-6">
            {ready ? (
              <>
                <FocusCard ref={focusRef} day={day} highlight={highlight} />
                <PriorityList day={day} />
                <TaskList day={day} />
              </>
            ) : (<><Skeleton className="h-48" /><Skeleton className="h-64" /><Skeleton className="h-64" /></>)}
            <div className="grid gap-6 2xl:grid-cols-2 items-start">
              <Scratchpad date={date} />
              <IdeasPanel />
            </div>
          </div>
          <div className="min-w-0 flex flex-col gap-6">
            {ready ? <DailyTimeline day={day} settings={me?.settings} /> : <Skeleton className="h-96" />}
            <GraphPanel />
            {ready && <FocusChart day={day} />}
            <DailyInsight />
            <SavedReading />
          </div>
        </div>
      )}
    </>
  );
}
