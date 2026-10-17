import { useState } from 'react';
import Chip from './Chip';
import Icon from './Icon';

/* Shows the real Google API calls behind a demo step. Hidden until asked for. */
export default function UnderTheHood({ label = 'Under the hood', children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Chip tone="quiet" size="s" onClick={() => setOpen(!open)} aria-expanded={open} className="self-start">
        <Icon name="tag" size={14} />{open ? 'Hide' : 'Show'} {label}
      </Chip>
      {open && <div className="animate-fade rounded-xl bg-[#0A0F1C] text-[#E6E9F7] border border-border p-4 text-[12.5px] leading-[1.6] font-mono overflow-x-auto flex flex-col gap-3">{children}</div>}
    </div>
  );
}
