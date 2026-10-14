import Button from './Button';

export function Skeleton({ className = 'h-24' }) {
  return <div className={`animate-pulse bg-quiet-tint rounded-[10px] ${className}`} />;
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="bg-white border border-border rounded-[14px] p-6 flex flex-wrap items-center gap-4">
      <span className="flex-1 min-w-0 text-conflict-ink font-semibold">{error?.message || 'Something went wrong.'}</span>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}
