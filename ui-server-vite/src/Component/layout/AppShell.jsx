import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Toast from '../ui/Toast';

export default function AppShell() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable) return;
      e.preventDefault();
      navigate('/ask', { state: { focus: true } });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-ground">
      <Sidebar />
      <div className="flex-1 md:ml-64 min-w-0 flex flex-col">
        <TopBar />
        <main className="px-10 pt-8 pb-16 flex flex-col gap-7"><Outlet /></main>
      </div>
      <Toast />
    </div>
  );
}
