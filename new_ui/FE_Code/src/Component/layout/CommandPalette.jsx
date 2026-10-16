import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { ALL_NAV } from './nav';
import { useAskFlow, useMe, useSuggestions } from '../../api/hooks';
import { useTheme } from '../../context/contexts';

/* a fresh value each time, so Today re-focuses the add-task field even when already open */
const newTaskState = () => ({ addTask: Date.now() });

/* Ctrl/Cmd+K launcher: jump to a page, run an action, or send a question to Ask. Mounted only while open. */
export default function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const run = useAskFlow();
  const { setMode } = useTheme();
  const { data: me } = useMe();
  const { data: suggestions = [] } = useSuggestions();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    input.current?.focus();
    return () => prev?.focus?.();
  }, []);

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    const match = (s) => !t || s.toLowerCase().includes(t);
    const out = [];
    if (t) out.push({ id: 'ask', section: 'Ask', icon: 'sparkles', label: `Ask DayGraph: “${q.trim()}”`, ai: true, go: () => { run(q.trim()); navigate('/ask'); } });
    ALL_NAV.filter((n) => (!n.managerOnly || me?.isManager) && match(n.label))
      .forEach((n) => out.push({ id: n.to, section: 'Go to', icon: n.icon, label: n.label, go: () => navigate(n.to) }));
    [
      { id: 'task', icon: 'plus', label: 'New task for today', go: () => navigate('/', { state: newTaskState() }) },
      { id: 'light', icon: 'sun', label: 'Switch to light theme', go: () => setMode('light') },
      { id: 'dark', icon: 'moon', label: 'Switch to dark theme', go: () => setMode('dark') },
      { id: 'system', icon: 'monitor', label: 'Use system theme', go: () => setMode('system') },
    ].filter((a) => match(a.label)).forEach((a) => out.push({ ...a, section: 'Actions' }));
    if (!t) suggestions.slice(0, 3).forEach((s) => out.push({ id: `s-${s}`, section: 'Suggested questions', icon: 'msg', label: s, go: () => { run(s); navigate('/ask'); } }));
    return out;
  }, [q, me, suggestions, run, navigate, setMode]);

  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const pick = (it) => { onClose(); it.go(); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Tab') e.preventDefault(); /* keep focus inside the dialog */
  };

  let lastSection = null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKey}>
      <div className="absolute inset-0 bg-overlay backdrop-blur-[2px] animate-fade" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Command menu"
        className="relative w-full max-w-[620px] rounded-2xl bg-surface border border-border shadow-pop overflow-hidden animate-pop">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-divider">
          <Icon name="search" size={18} className="text-muted" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }}
            placeholder="Search pages and actions, or ask a question…" aria-label="Command"
            role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={items[active] ? `cmd-${active}` : undefined}
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-faint focus-visible:outline-none" />
          <kbd className="text-[11px] font-semibold text-muted border border-border rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul id="cmd-list" ref={list} role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-8 text-center text-muted">No matches.</li>}
          {items.map((it, i) => {
            const header = it.section !== lastSection ? it.section : null;
            lastSection = it.section;
            return (
              <li key={it.id} role="presentation">
                {header && <div className="px-3 pt-2.5 pb-1.5 text-[11.5px] font-semibold uppercase tracking-[.06em] text-faint">{header}</div>}
                <div id={`cmd-${i}`} role="option" aria-selected={i === active} data-active={i === active}
                  onMouseMove={() => setActive(i)} onClick={() => pick(it)}
                  className={`flex items-center gap-3 px-3 h-11 rounded-[10px] cursor-pointer ${i === active ? 'bg-accent-tint text-ink' : 'text-ink'}`}>
                  <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${it.ai ? 'bg-ai-tint text-ai' : 'bg-quiet-tint text-muted'}`}><Icon name={it.icon} size={15} /></span>
                  <span className="flex-1 truncate font-medium">{it.label}</span>
                  {i === active && <Icon name="arrowR" size={15} className="text-muted" />}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 px-4 h-10 border-t border-divider text-[12px] text-muted">
          <span><kbd className="font-semibold">↑↓</kbd> to move</span><span><kbd className="font-semibold">Enter</kbd> to open</span>
          <span className="ml-auto inline-flex items-center gap-1.5"><Icon name="sparkles" size={13} className="text-ai" />Questions go to Ask</span>
        </div>
      </div>
    </div>
  );
}
