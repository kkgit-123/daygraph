import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import Toast from '../ui/Toast';

const COLLAPSE_KEY = 'dg-sidebar-collapsed';

export default function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);

  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
    return !c;
  });

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return; }
      if (e.key === 'Escape') { setMobileOpen(false); return; }
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable) return;
      e.preventDefault();
      navigate('/ask', { state: { focus: true } });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-ground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-surface focus:shadow-pop">Skip to content</a>
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={`min-w-0 flex flex-col transition-[padding] duration-200 ${collapsed ? 'md:pl-[72px]' : 'md:pl-[248px]'}`}>
        <TopBar onMenu={() => setMobileOpen(true)} onCommand={() => setPalette(true)} />
        <main id="main" key={pathname} className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16 flex flex-col gap-6 animate-[fade_260ms_ease-out_both]">
          <Outlet />
        </main>
      </div>
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      <Toast />
    </div>
  );
}
