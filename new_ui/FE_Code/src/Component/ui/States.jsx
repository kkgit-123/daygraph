import Button from './Button';
import Icon from './Icon';

export function Skeleton({ className = 'h-24' }) {
  return <div aria-hidden="true" className={`skeleton rounded-2xl ${className}`} />;
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="bg-surface border border-conflict/30 rounded-2xl p-5 flex flex-wrap items-center gap-4">
      <span className="w-9 h-9 rounded-[10px] bg-conflict-tint text-conflict inline-flex items-center justify-center shrink-0"><Icon name="alert" size={18} /></span>
      <span className="flex-1 min-w-0 text-conflict-ink font-semibold">{error?.message || 'Something went wrong.'}</span>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}><Icon name="refresh" size={14} />Retry</Button>}
    </div>
  );
}

export function EmptyState({ icon = 'sparkles', title, children }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-7 px-4">
      <span className="w-10 h-10 rounded-xl bg-quiet-tint text-muted inline-flex items-center justify-center"><Icon name={icon} size={19} /></span>
      <div className="font-semibold">{title}</div>
      {children && <div className="text-muted text-[13px] max-w-[320px]">{children}</div>}
    </div>
  );
}
