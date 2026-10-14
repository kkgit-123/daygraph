import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import Chip from '../ui/Chip';
import { useMe } from '../../api/hooks';
import { useUi } from '../../context/contexts';

const CRUMBS = { '/': 'Today', '/team': 'Team', '/review': 'Review', '/ask': 'Ask', '/graph': 'Decision graph', '/settings': 'Settings' };

export default function TopBar() {
  const { data: me } = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { flash } = useUi();
  const live = me?.modes?.google === 'live';
  return (
    <header className="flex flex-wrap items-center gap-4 min-h-[68px] px-10 py-3 bg-white border-b border-border">
      <div className="flex items-center gap-2 text-[14px] whitespace-nowrap">
        <span className="text-muted">{me?.workspace?.name || 'Payments launch'}</span>
        <Icon name="chevR" size={14} sw={2.2} color="#9AA1BC" />
        <span className="font-semibold">{CRUMBS[pathname] || 'DayGraph'}</span>
      </div>
      <span className="flex-1" />
      <button type="button" aria-label="Search and ask" onClick={() => navigate('/ask', { state: { focus: true } })}
        className="flex-[1_1_320px] max-w-[520px] h-10 flex items-center gap-2.5 px-3.5 border border-[#D5D9E8] rounded-[10px] bg-[#F7F8FC] text-muted hover:bg-[#F0F2F9]">
        <Icon name="search" size={18} sw={1.9} />
        <span className="flex-1">Search decisions, documents and notes</span>
        <span className="text-xs border border-field-border rounded-md px-[7px] py-px bg-white">/</span>
      </button>
      <span className="flex-1" />
      <span className="inline-flex items-center gap-2 text-[13px] text-quiet-ink">
        <span className="w-2 h-2 rounded-full bg-[#35C28F]" />{me?.syncLabel || 'Synced with Google Workspace'}
      </span>
      <Chip>{live ? 'Live' : 'Live'}</Chip>
      <button type="button" aria-label="Notifications" onClick={() => flash('This part of the product is not in the prototype.')}
        className="relative w-10 h-10 rounded-[10px] inline-flex items-center justify-center text-quiet-ink shrink-0 hover:bg-quiet-tint">
        <Icon name="bell" size={20} sw={1.8} />
        <span className="absolute top-[9px] right-2.5 w-2 h-2 rounded-full bg-conflict border-2 border-white" />
      </button>
    </header>
  );
}
