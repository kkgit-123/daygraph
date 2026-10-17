import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import Chip from '../ui/Chip';
import Avatar from '../ui/Avatar';
import Popover from '../ui/Popover';
import ThemeSwitcher from './ThemeSwitcher';
import { labelFor } from './nav';
import { useMe } from '../../api/hooks';
import { useSession } from '../../context/contexts';

const iconBtn = 'relative w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-muted hover:text-ink hover:bg-quiet-tint transition-colors shrink-0';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

/* Notifications come from real account state: decisions waiting, broken connections, paused analysis. */
function Notifications({ me }) {
  const navigate = useNavigate();
  const items = [];
  if (me?.reviewCount) items.push({ id: 'review', icon: 'inbox', tone: 'bg-warn-tint text-warn', title: `${me.reviewCount} ${me.reviewCount === 1 ? 'decision' : 'decisions'} waiting for review`, body: 'Nothing is created until you accept.', to: '/review' });
  (me?.connections || []).filter((c) => c.status === 'error').forEach((c) => items.push({ id: c.service, icon: 'alert', tone: 'bg-conflict-tint text-conflict', title: `${c.label} needs reconnecting`, body: 'DayGraph cannot read new items until it is reconnected.', to: '/settings' }));
  if (me && me.analysisEnabled === false) items.push({ id: 'paused', icon: 'pause', tone: 'bg-quiet-tint text-muted', title: 'Meeting analysis is paused', body: 'New meetings are not analysed.', to: '/settings' });

  return (
    <Popover label="Notifications" width={340}
      trigger={(p) => (
        <button type="button" aria-label={`Notifications${items.length ? `, ${items.length} new` : ''}`} className={iconBtn} {...p}>
          <Icon name="bell" size={18} />
          {items.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-conflict ring-2 ring-surface" />}
        </button>
      )}>
      {(close) => (
        <>
          <div className="px-2.5 pt-2 pb-1.5 flex items-center"><span className="font-semibold flex-1">Notifications</span>{items.length > 0 && <Chip tone="accent">{items.length}</Chip>}</div>
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-muted text-[13px]">You're all caught up.</div>
          ) : items.map((n) => (
            <button key={n.id} type="button" onClick={() => { close(); navigate(n.to); }}
              className="w-full flex gap-3 items-start p-2.5 rounded-xl hover:bg-quiet-tint text-left">
              <span className={`w-8 h-8 rounded-[9px] inline-flex items-center justify-center shrink-0 ${n.tone}`}><Icon name={n.icon} size={16} /></span>
              <span className="flex-1 min-w-0"><span className="block font-semibold text-[13.5px]">{n.title}</span><span className="block text-muted text-[12.5px]">{n.body}</span></span>
            </button>
          ))}
        </>
      )}
    </Popover>
  );
}

function ProfileMenu({ me }) {
  const { logout } = useSession();
  const navigate = useNavigate();
  const user = me?.user;
  if (!user) return null;
  return (
    <Popover label="Account" width={260}
      trigger={(p) => (
        <button type="button" aria-label="Account menu" className="rounded-full ml-0.5 shrink-0 hover:ring-2 hover:ring-border transition-shadow" {...p}>
          <Avatar initials={user.initials} size={30} />
        </button>
      )}>
      {(close) => (
        <>
          <div className="flex items-center gap-3 p-2.5">
            <Avatar initials={user.initials} size={38} />
            <div className="min-w-0"><div className="font-semibold truncate">{user.name}</div><div className="text-muted text-[12.5px] truncate">{[user.role, user.city].filter(Boolean).join(', ')}</div></div>
          </div>
          <div className="h-px bg-divider my-1" />
          <Link to="/settings" onClick={close} className="flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] hover:bg-quiet-tint text-[13.5px] font-medium"><Icon name="settings" size={16} className="text-muted" />Settings</Link>
          <button type="button" onClick={() => { close(); logout(); navigate('/login', { replace: true }); }}
            className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] hover:bg-quiet-tint text-[13.5px] font-medium"><Icon name="logout" size={16} className="text-muted" />Sign out</button>
        </>
      )}
    </Popover>
  );
}

export default function TopBar({ onMenu, onCommand }) {
  const { data: me } = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const live = me?.modes?.google === 'live';
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 sm:gap-3 h-16 px-4 sm:px-6 lg:px-8 bg-ground/80 backdrop-blur-md border-b border-border">
      <button type="button" onClick={onMenu} aria-label="Open menu" className={`${iconBtn} md:hidden -ml-1`}><Icon name="menu" size={19} /></button>
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[13.5px] whitespace-nowrap min-w-0">
        <span className="text-muted truncate">{me?.workspace?.name || 'Payments launch'}</span>
        <Icon name="chevR" size={13} sw={2.2} className="text-faint" />
        <span className="font-semibold truncate" aria-current="page">{labelFor(pathname) || 'DayGraph'}</span>
      </nav>
      <span className="flex-1" />
      <button type="button" aria-label="Search and ask" aria-keyshortcuts="Control+K Meta+K" onClick={onCommand}
        className="group flex-[1_1_auto] max-w-[440px] h-9 flex items-center gap-2.5 px-3 border border-border rounded-[10px] bg-surface text-muted hover:border-field-border hover:text-ink transition-colors min-w-0">
        <Icon name="search" size={16} sw={2} />
        <span className="flex-1 truncate text-[13.5px]"><span className="hidden sm:inline">Search decisions, documents and notes</span><span className="sm:hidden">Search or ask</span></span>
        <kbd className="hidden sm:inline text-[11px] font-semibold border border-border rounded-md px-1.5 py-px bg-surface-2">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <span className="flex-1 hidden lg:block" />
      <span className="hidden xl:inline-flex items-center gap-2 text-[12.5px] text-muted whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-ok breathe" />{me?.syncLabel || 'Synced with Google Workspace'}
      </span>
      <Chip tone="ok" className="hidden sm:inline-flex">{live ? 'Live' : 'Live'}</Chip>
      <button type="button" onClick={() => navigate('/', { state: { addTask: Date.now() } })} aria-label="New task"
        className="hidden sm:inline-flex h-9 items-center gap-1.5 px-3 rounded-[10px] bg-accent text-on-accent font-semibold text-[13px] hover:bg-accent-hover transition-colors shrink-0">
        <Icon name="plus" size={16} sw={2.4} /><span className="hidden lg:inline">New task</span>
      </button>
      <Notifications me={me} />
      <ThemeSwitcher />
      <ProfileMenu me={me} />
    </header>
  );
}
