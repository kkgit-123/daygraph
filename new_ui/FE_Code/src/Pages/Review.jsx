import PageHeader from '../Component/layout/PageHeader';
import Panel from '../Component/ui/Panel';
import { ErrorBox, Skeleton } from '../Component/ui/States';
import DecisionCard from '../Component/review/DecisionCard';
import ResolvedRow from '../Component/review/ResolvedRow';
import HowChecked from '../Component/review/HowChecked';
import ReviewHeader from '../Component/review/ReviewHeader';
import { useAcceptAll, useDecisions } from '../api/hooks';

export default function Review() {
  const { data, isLoading, error, refetch } = useDecisions('all');
  const acceptAll = useAcceptAll();
  const meeting = data?.meeting;
  const items = data?.items || [];
  const easy = items.filter((d) => d.state === 'pending' && !d.conflict).length;

  return (
    <>
      <PageHeader title="Review decisions" subtitle="From this morning’s Payments launch sync. Nothing is created until you accept." />
      {error ? <ErrorBox error={error} onRetry={refetch} /> : isLoading ? (
        <div className="flex flex-col gap-5"><Skeleton className="h-20" /><Skeleton className="h-64" /></div>
      ) : (
        <div className="flex flex-wrap gap-6 items-start">
          <div className="flex-[999_1_480px] min-w-0 flex flex-col gap-5">
            {meeting && <ReviewHeader meeting={meeting} easy={easy} busy={acceptAll.isPending} onAcceptAll={() => acceptAll.mutate()} />}
            {items.length === 0 && <Panel className="p-6 text-muted">Nothing to review right now.</Panel>}
            {items.map((d) => (d.state === 'pending' ? <DecisionCard key={d.id} d={d} /> : <ResolvedRow key={d.id} d={d} />))}
          </div>
          <HowChecked checks={meeting?.checks} />
        </div>
      )}
    </>
  );
}
