import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import Logo, { LogoMark } from '../ui/Logo';
import Switch from '../ui/Switch';
import { NAV } from './nav';
import { useMe, useUpdateSettings } from '../../api/hooks';
import { useUi } from '../../context/contexts';

const NOT_IN_PROTO = 'This part of the product is not in the prototype.';

function NavItem({ item, collapsed, badge, onNavigate }) {
  return (
    <NavLink to={item.to} end={item.to === '/'} onClick={onNavigate}
      data-tip={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) => `tip group relative flex items-center gap-3 h-9 rounded-[10px] text-[13.5px] font-medium transition-colors duration-150 ${collapsed ? 'justify-center w-10 mx-auto' : 'px-3'} ${isActive ? 'bg-accent-tint text-accent-ink' : 'text-muted hover:text-ink hover:bg-quiet-tint'}`}>
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-accent" />}
          <Icon name={item.icon} size={18} sw={isActive ? 2 : 1.75} />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.tag && <span className="h-[18px] px-1.5 rounded-md bg-ai-tint text-ai-ink text-[10.5px] font-bold uppercase tracking-[.04em] inline-flex items-center">{item.tag}</span>}
          {badge > 0 && (collapsed
            ? <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warn ring-2 ring-sidebar" aria-label={`${badge} waiting`} />
            : <span className="min-w-5 h-5 px-1.5 rounded-full bg-warn-tint text-warn-ink text-[11.5px] font-bold inline-flex items-center justify-center tabular">{badge}</span>)}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const { data: me } = useMe();
  const { flash } = useUi();
  const settings = useUpdateSettings();
  const soon = () => flash(NOT_IN_PROTO);
  const on = me?.analysisEnabled !== false;
  const user = me?.user;
  const compact = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && <div className="md:hidden fixed inset-0 z-40 bg-overlay animate-fade" onClick={onCloseMobile} aria-hidden="true" />}
      <aside aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-border transition-[width,transform] duration-200 ease-[var(--ease-out)]
          ${compact ? 'md:w-[72px]' : 'md:w-[248px]'} w-[272px] ${mobileOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`flex items-center h-16 shrink-0 ${compact ? 'justify-center' : 'px-4 justify-between'}`}>
          {compact
            ? <button type="button" onClick={onToggle} aria-label="Expand sidebar" className="tip rounded-[10px]" data-tip="Expand"><LogoMark size={32} /></button>
            : <Logo size={30} />}
          {!compact && (
            <>
              <button type="button" onClick={onToggle} aria-label="Collapse sidebar"
                className="hidden md:inline-flex w-8 h-8 rounded-lg items-center justify-center text-faint hover:text-ink hover:bg-quiet-tint"><Icon name="sidebar" size={17} /></button>
              <button type="button" onClick={onCloseMobile} aria-label="Close menu"
                className="md:hidden w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted hover:bg-quiet-tint"><Icon name="x" size={18} /></button>
            </>
          )}
        </div>

        {/* collapsed rail stays unclipped so hover tooltips can extend past it */}
        <div className={`flex-1 min-h-0 px-3 pb-3 flex flex-col gap-4 ${compact ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
          <button type="button" onClick={soon} aria-label="Switch workspace" data-tip={compact ? me?.workspace?.name : undefined}
            className={`tip flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 hover:bg-surface-2 transition-colors ${compact ? 'w-10 h-10 mx-auto justify-center' : 'w-full px-2.5 py-2'}`}>
            <span className="w-7 h-7 rounded-lg bg-[linear-gradient(135deg,#FBBC04,#F29900)] text-[#3A2600] font-bold text-[13px] inline-flex items-center justify-center shrink-0">
              {(me?.workspace?.name || 'P')[0]}
            </span>
            {!compact && (
              <>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[13px] truncate">{me?.workspace?.name || 'Payments launch'}</span>
                  <span className="block text-[11.5px] text-muted truncate">{me?.workspace?.subtitle || ''}</span>
                </span>
                <Icon name="updown" size={14} sw={2} className="text-faint" />
              </>
            )}
          </button>

          <nav aria-label="Main" className="flex flex-col gap-3.5">
            {NAV.map((g) => {
              const items = g.items.filter((i) => !i.managerOnly || me?.isManager);
              if (!items.length) return null;
              return (
                <div key={g.group} className="flex flex-col gap-0.5">
                  {compact
                    ? <div className="h-px bg-divider mx-2 mb-1.5" aria-hidden="true" />
                    : <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-faint px-3 pb-1">{g.group}</div>}
                  {items.map((item) => (
                    <NavItem key={item.to} item={item} collapsed={compact} onNavigate={onCloseMobile}
                      badge={item.badge === 'review' ? me?.reviewCount || 0 : 0} />
                  ))}
                </div>
              );
            })}
          </nav>

          {!compact && (
            <div className="flex flex-col gap-2 px-1">
              <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-faint px-2">Google Workspace</div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {(me?.connections || []).map((c) => {
                  const bad = c.status === 'error';
                  return bad ? (
                    <button key={c.service} type="button" onClick={soon}
                      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-conflict-tint text-conflict-ink text-[11.5px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-conflict" />{c.label} · Reconnect Google
                    </button>
                  ) : (
                    <span key={c.service} className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-quiet-tint text-quiet-ink text-[11.5px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-ok" />{c.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-divider p-3 flex flex-col gap-2.5">
          {!compact && (
            <div className="p-3 rounded-xl bg-surface-2/70 border border-border flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5">
                <Icon name="video" size={15} className="text-ai" />
                <span className="flex-1 font-semibold text-[13px]" id="analysis-label">Meeting analysis</span>
                <Switch on={on} labelledBy="analysis-label" onChange={() => settings.mutate({ analysisEnabled: !on })} />
              </div>
              <div className="text-[12px] leading-[1.45] text-muted">
                {on ? 'On for meetings you attend. Notes and ideas stay private to you.' : 'Paused. DayGraph will not analyse new meetings.'}
              </div>
            </div>
          )}
          <NavLink to="/settings" onClick={onCloseMobile} data-tip={compact ? 'Settings' : undefined}
            className={({ isActive }) => `tip flex items-center gap-2.5 rounded-xl transition-colors ${compact ? 'justify-center p-1.5' : 'p-2'} ${isActive ? 'bg-accent-tint' : 'hover:bg-quiet-tint'}`}>
            {user ? <Avatar initials={user.initials} size={30} /> : <Icon name="settings" size={18} />}
            {!compact && user && (
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] truncate">{user.name}</div>
                <div className="text-[11.5px] text-muted truncate">{[user.role, user.city].filter(Boolean).join(', ')}</div>
              </div>
            )}
            {!compact && <Icon name="settings" size={16} className="text-faint" />}
          </NavLink>
        </div>
      </aside>
    </>
  );
}
