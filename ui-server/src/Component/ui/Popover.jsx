import { useEffect, useId, useRef, useState } from 'react';

/*
  Small anchored menu. Closes on outside click, Escape (focus returns to the trigger) and route change.
  trigger: (props) => element, gets aria and onClick props to spread on a button.
*/
export default function Popover({ trigger, children, align = 'right', width = 300, label }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const btn = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div ref={box} className="relative">
      {trigger({ ref: btn, 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': 'true', onClick: () => setOpen((o) => !o) })}
      {open && (
        <div id={id} role="dialog" aria-label={label}
          className={`animate-pop absolute top-[calc(100%+8px)] z-50 rounded-2xl bg-surface border border-border shadow-pop p-1.5 max-w-[calc(100vw-24px)] ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
          style={{ width }}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
