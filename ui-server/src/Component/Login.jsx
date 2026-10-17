import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from './ui/Button';
import Panel from './ui/Panel';
import Icon from './ui/Icon';
import { LogoMark } from './ui/Logo';
import ThemeSwitcher from './layout/ThemeSwitcher';
import DayOrb from './fx/DayOrb';
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
    <div className="relative min-h-screen w-full bg-ground flex items-center justify-center p-4 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[radial-gradient(40%_50%_at_20%_10%,color-mix(in_oklab,var(--color-accent)_18%,transparent),transparent),radial-gradient(40%_50%_at_85%_90%,color-mix(in_oklab,var(--color-ai)_16%,transparent),transparent)]" />
      <DayOrb className="absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_50%,#000_55%,transparent)]" options={{ nodes: 220, pulses: 22, cameraZ: 5.4 }} />
      <div className="aurora opacity-40" aria-hidden="true"><span /><span /></div>
      <div className="absolute top-4 right-4 z-10"><ThemeSwitcher /></div>
      <main className="relative w-full max-w-[440px] flex flex-col gap-6 animate-rise">
        <div className="flex flex-col items-center text-center gap-4">
          <LogoMark size={56} className="drop-shadow-[0_8px_24px_rgba(124,77,255,.45)]" />
          <div>
            <h1 className="text-[34px] font-semibold tracking-[-0.035em]">Day<span className="text-shimmer">Graph</span></h1>
            <p className="mt-1 text-[15px] text-ink font-medium">Your day, intelligently orchestrated.</p>
          </div>
        </div>
        <Panel className="p-6 sm:p-8 flex flex-col gap-5 shadow-pop bg-surface/70! backdrop-blur-xl">
          <p className="text-muted text-[14px] leading-[1.6] text-center">Decision memory for teams. Your meetings, decisions and tasks, with a source for every answer.</p>
          {live ? (
            <Button onClick={signIn} disabled={busy} size="lg" className="w-full">Sign in with Google</Button>
          ) : (
            <div className="w-full flex flex-col gap-2.5">
              <Button onClick={() => handle('aiko')} disabled={busy} size="lg" className="w-full">Continue as Aiko Tanaka · Developer</Button>
              <Button variant="secondary" onClick={() => handle('mei')} disabled={busy} size="lg" className="w-full">Continue as Mei Chen · Team lead</Button>
              <p className="text-faint text-[12px] text-center mt-1">Demo workspace with sample data. No Google account needed.</p>
            </div>
          )}
          {error && <p role="alert" className="text-conflict-ink font-semibold text-[13.5px] text-center">{error}</p>}
        </Panel>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5"><Icon name="target" size={14} className="text-accent" />Prioritised days</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="graph" size={14} className="text-ai" />Decision graph</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="shield" size={14} className="text-ok" />Cited answers</span>
        </div>
      </main>
    </div>
  );
};

export default Login;
