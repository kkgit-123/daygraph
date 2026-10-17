import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SessionContext, ThemeContext, UiContext } from './contexts';
import { setErrorSink } from '../api/client';

const THEME_KEY = 'dg-theme';
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;

/* Light / Dark / System. index.html applies the stored choice before first paint; this keeps it in sync. */
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
  });
  const [sysDark, setSysDark] = useState(systemDark);
  const resolved = mode === 'system' ? (sysDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const on = (e) => setSysDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute('data-theme') === resolved) return undefined;
    root.classList.add('theme-transition');
    root.setAttribute('data-theme', resolved);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0B1020' : '#F8FAFD');
    const t = setTimeout(() => root.classList.remove('theme-transition'), 320);
    return () => clearTimeout(t);
  }, [resolved]);

  /* decorative animations pause while the tab is hidden */
  useEffect(() => {
    const on = () => document.documentElement.setAttribute('data-hidden', document.hidden ? 'true' : 'false');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  const setMode = useCallback((m) => {
    try { localStorage.setItem(THEME_KEY, m); } catch { /* ignore */ }
    setModeState(m);
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function SessionProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('access_token'); } catch { return null; }
  });
  const login = useCallback((jwt) => {
    try { localStorage.setItem('access_token', jwt); } catch { /* ignore */ }
    setToken(jwt);
  }, []);
  const logout = useCallback(() => {
    try { localStorage.removeItem('access_token'); } catch { /* ignore */ }
    setToken(null);
  }, []);
  const value = useMemo(() => ({ token, login, logout }), [token, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function UiProvider({ children }) {
  const [toast, setToast] = useState('');
  const timer = useRef(null);
  const flash = useCallback((msg) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  useEffect(() => {
    setErrorSink(flash);
    return () => { setErrorSink(null); if (timer.current) clearTimeout(timer.current); };
  }, [flash]);

  const [graphSel, setGraphSel] = useState(null);
  const [hide, setHide] = useState({ person: false, meeting: false, task: false });
  const [edgeLabels, setEdgeLabels] = useState(false);
  const [ask, setAsk] = useState({ question: '', answer: null, status: 'idle' });
  const [citeN, setCiteN] = useState(null);
  const [replanToken, setReplanToken] = useState(null);
  const toggleHide = useCallback((k) => setHide((h) => ({ ...h, [k]: !h[k] })), []);

  const value = useMemo(() => ({
    toast, flash, graphSel, setGraphSel, hide, toggleHide, edgeLabels, setEdgeLabels,
    ask, setAsk, citeN, setCiteN, replanToken, setReplanToken,
  }), [toast, flash, graphSel, hide, toggleHide, edgeLabels, ask, citeN, replanToken]);
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
