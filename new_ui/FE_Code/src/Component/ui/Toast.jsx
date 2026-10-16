import { useUi } from '../../context/contexts';
import Icon from './Icon';

export default function Toast() {
  const { toast } = useUi();
  return (
    <div role="status" aria-live="polite" className="fixed left-1/2 bottom-6 -translate-x-1/2 z-[70] pointer-events-none max-w-[calc(100vw-32px)]">
      {toast && (
        <div key={toast} className="animate-rise flex items-center gap-2.5 pl-3 pr-5 py-3 rounded-xl bg-surface-2 text-ink border border-border font-semibold shadow-pop">
          <span className="w-6 h-6 rounded-full bg-ok-tint text-ok inline-flex items-center justify-center"><Icon name="check" size={14} sw={2.6} /></span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
