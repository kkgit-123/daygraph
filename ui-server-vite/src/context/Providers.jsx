import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SessionContext, UiContext } from './contexts';
import { setErrorSink } from '../api/client';

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
