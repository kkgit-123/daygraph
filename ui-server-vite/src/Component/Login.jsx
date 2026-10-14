import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from './ui/Button';
import Panel from './ui/Panel';
import { devLogin, request } from '../api/client';
import { API_ENDPOINTS } from '../apiConfig';

const ERRORS = {
  not_invited: 'Your Google account is not linked to a DayGraph person yet. Ask an admin to add your email.',
  cancelled: 'Sign-in was cancelled.',
  expired: 'That sign-in link expired. Try again.',
  domain: 'Use your work Google account to sign in.',
};

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(ERRORS[params.get('error')] || '');
  const [live, setLive] = useState(false);

  /* Google sends the token back in the URL fragment after sign-in; it is stored and removed from the address bar */
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      onLogin(token);
      navigate('/', { replace: true });
    }
  }, [onLogin, navigate]);

  useEffect(() => {
    request('GET', API_ENDPOINTS.health, { auth: false })
      .then((h) => setLive(h?.modes?.google === 'live'))
      .catch(() => setLive(false));
  }, []);

  const handle = async (user) => {
    setBusy(true);
    setError('');
    try {
      const data = await devLogin(user);
      onLogin(data.accessToken);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message || 'Sign in failed');
      setBusy(false);
    }
  };

  const signIn = async () => {
    setBusy(true);
    setError('');
    try {
      const { url } = await request('GET', API_ENDPOINTS.googleSignin, { auth: false });
      window.location.assign(url);
    } catch (e) {
      setError(e.message || 'Sign in failed');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-ground flex items-center justify-center p-4">
      <Panel className="w-full max-w-[420px] p-9 flex flex-col items-center gap-5 text-center">
        <svg width="48" height="48" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill="#3540D3" />
          <path d="M10 11h12M10 11l6 12M22 11l-6 12" stroke="#fff" strokeWidth="1.5" strokeOpacity=".7" fill="none" />
          <circle cx="10" cy="11" r="3" fill="#fff" /><circle cx="22" cy="11" r="3" fill="#fff" fillOpacity=".6" /><circle cx="16" cy="23" r="3" fill="#fff" />
        </svg>
        <h1 className="text-[26px] font-bold tracking-[-0.015em]">DayGraph</h1>
        <p className="text-muted text-[15px] leading-normal">Decision memory for teams. Your meetings, decisions and tasks, with a source for every answer.</p>
        {live ? (
          <Button onClick={signIn} disabled={busy} className="w-full h-11">Sign in with Google</Button>
        ) : (
          <div className="w-full flex flex-col gap-2.5">
            <Button onClick={() => handle('aiko')} disabled={busy} className="w-full h-11">Continue as Aiko Tanaka · Developer</Button>
            <Button variant="secondary" onClick={() => handle('mei')} disabled={busy} className="w-full h-11">Continue as Mei Chen · Team lead</Button>
          </div>
        )}
        {error && <p role="alert" className="text-conflict-ink font-semibold text-[13.5px]">{error}</p>}
      </Panel>
    </div>
  );
};

export default Login;
