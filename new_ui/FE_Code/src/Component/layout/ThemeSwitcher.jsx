import Icon from '../ui/Icon';
import Popover from '../ui/Popover';
import { useTheme } from '../../context/contexts';

const THEMES = [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'monitor']];

/* Segmented Light / Dark / System control, used inline (Settings) and inside the top bar menu */
export function ThemeSegment({ className = '' }) {
  const { mode, setMode } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className={`grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-2 border border-border ${className}`}>
      {THEMES.map(([k, label, icon]) => (
        <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
          className={`h-8 rounded-[9px] inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold transition-colors duration-150 ${mode === k ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}>
          <Icon name={icon} size={14} sw={2} />{label}
        </button>
      ))}
    </div>
  );
}

export default function ThemeSwitcher() {
  const { resolved, mode } = useTheme();
  return (
    <Popover label="Theme" width={260}
      trigger={(p) => (
        <button type="button" aria-label={`Theme: ${mode}`} {...p}
          className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-muted hover:text-ink hover:bg-quiet-tint transition-colors">
          <span key={resolved} className="inline-flex animate-[pop_220ms_var(--ease-out)_both]"><Icon name={resolved === 'dark' ? 'moon' : 'sun'} size={18} /></span>
        </button>
      )}>
      <div className="px-2.5 pt-2 pb-2 text-[12px] font-semibold text-muted">Appearance</div>
      <ThemeSegment />
    </Popover>
  );
}
