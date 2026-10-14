import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import { useMe, useUpdateSettings } from '../../api/hooks';
import { useUi } from '../../context/contexts';

const NOT_IN_PROTO = 'This part of the product is not in the prototype.';

function NavButton({ icon, label, active, badge, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 w-full h-[42px] px-3.5 rounded-[10px] font-semibold transition-colors duration-150 ${active ? 'bg-white/15 text-white' : 'text-[#C5CAF0] hover:bg-white/10'}`}>
      <Icon name={icon} size={20} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="min-w-6 h-6 px-[7px] rounded-full bg-[#F2B54A] text-[#3A2600] text-[12.5px] font-bold inline-flex items-center justify-center">{badge}</span>
      )}
    </button>
  );
}

export default function Sidebar() {
  const { data: me } = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { flash } = useUi();
  const settings = useUpdateSettings();
  const go = (p) => { navigate(p); window.scrollTo(0, 0); };
  const soon = () => flash(NOT_IN_PROTO);
  const on = me?.analysisEnabled !== false;
  const user = me?.user;

  return (
    <aside className="w-full md:w-64 md:fixed md:inset-y-0 md:overflow-y-auto bg-rail text-white flex flex-col px-3.5 py-5 gap-[22px]">
      <div className="flex items-center gap-3 px-1.5">
        <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill="#4552E0" />
          <path d="M10 11h12M10 11l6 12M22 11l-6 12" stroke="#fff" strokeWidth="1.5" strokeOpacity=".7" fill="none" />
          <circle cx="10" cy="11" r="3" fill="#fff" /><circle cx="22" cy="11" r="3" fill="#fff" fillOpacity=".6" /><circle cx="16" cy="23" r="3" fill="#fff" />
        </svg>
        <span className="text-[20px] font-bold tracking-[-0.01em]">DayGraph</span>
      </div>

      <button type="button" onClick={soon} aria-label="Switch workspace" className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/[.08]">
        <span className="w-9 h-9 rounded-[10px] bg-[#F2B54A] text-[#3A2600] font-bold text-base inline-flex items-center justify-center shrink-0">
          {(me?.workspace?.name || 'P')[0]}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[14.5px]">{me?.workspace?.name || 'Payments launch'}</span>
          <span className="block text-[12.5px] text-[#A3AAD9]">{me?.workspace?.subtitle || ''}</span>
        </span>
        <Icon name="updown" size={16} sw={2} color="#A3AAD9" />
      </button>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        <div className="text-[12.5px] font-semibold text-[#8E96CC] px-3.5 pb-1.5">Workspace</div>
        <NavButton icon="sun" label="Today" active={pathname === '/'} onClick={() => go('/')} />
        {me?.isManager && <NavButton icon="inbox" label="Team" active={pathname === '/team'} onClick={() => go('/team')} />}
        <NavButton icon="graph" label="Manager" active={pathname === '/manager'} onClick={() => go('/manager')} />
        <NavButton icon="inbox" label="Review" active={pathname === '/review'} badge={me?.reviewCount || 0} onClick={() => go('/review')} />
        <NavButton icon="msg" label="Ask" active={pathname === '/ask'} onClick={() => go('/ask')} />
        <NavButton icon="search" label="Enterprise search" active={pathname === '/search'} onClick={() => go('/search')} />
        <NavButton icon="spark" label="Agent" active={pathname === '/agent'} onClick={() => go('/agent')} />
        <div className="text-[12.5px] font-semibold text-[#8E96CC] px-3.5 pb-1.5 mt-4">Memory</div>
        <NavButton icon="graph" label="Decision graph" active={pathname === '/graph'} onClick={() => go('/graph')} />
        <NavButton icon="video" label="Meetings" active={pathname === '/meetings'} onClick={() => go('/meetings')} />
        <NavButton icon="book" label="Saved reading" active={pathname === '/reading'} onClick={() => go('/reading')} />
        <NavButton icon="bulb" label="Discover" active={pathname === '/discover'} onClick={() => go('/discover')} />
        <NavButton icon="cal" label="Add-ons" active={pathname === '/addons'} onClick={() => go('/addons')} />
        <NavButton icon="link" label="Google Cloud" active={pathname === '/google'} onClick={() => go('/google')} />
        <NavButton icon="shield" label="Admin" active={pathname === '/admin'} onClick={() => go('/admin')} />
      </nav>

      <div className="px-1.5 flex flex-col gap-3">
        <div className="text-[12.5px] font-semibold text-[#8E96CC]">Connected to Google Workspace</div>
        {(me?.connections || []).map((c) => {
          const bad = c.status === 'error';
          return (
            <div key={c.service} className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${bad ? 'bg-conflict' : 'bg-[#35C28F]'}`} />
              <span className="flex-1">{c.label}</span>
              {bad && <button type="button" onClick={soon} className="text-[12.5px] font-semibold text-[#FF9C8A]">Reconnect Google</button>}
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3.5">
        <div className="p-3.5 rounded-xl bg-white/[.07] flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex-1 font-semibold" id="analysis-label">Meeting analysis</span>
            <button type="button" role="switch" aria-checked={on} aria-labelledby="analysis-label"
              onClick={() => settings.mutate({ analysisEnabled: !on })}
              className={`w-9 h-5 rounded-full relative inline-block transition-colors duration-150 ${on ? 'bg-[#35C28F]' : 'bg-[#5A6199]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-150 ${on ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="text-[13px] leading-[1.5] text-[#C5CAF0]">
            {on ? 'On for meetings you attend. Notes and ideas stay private to you.' : 'Paused. DayGraph will not analyse new meetings.'}
          </div>
        </div>
        {user && (
          <Link to="/settings" className="flex items-center gap-3 px-1.5">
            <Avatar initials={user.initials} bg="#C9CEF8" color="#1B2150" size={38} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{user.name}</div>
              <div className="text-[13px] text-[#A3AAD9]">{[user.role, user.city].filter(Boolean).join(', ')}</div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
