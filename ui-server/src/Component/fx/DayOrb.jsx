import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/contexts';

const readColors = () => {
  const s = getComputedStyle(document.documentElement);
  const v = (n) => s.getPropertyValue(n).trim();
  return { accent: v('--color-accent'), ai: v('--color-ai'), ok: v('--color-ok') };
};

/*
  Decorative 3D orb (three.js, loaded on demand). Runs only while on screen and the tab is visible,
  renders one still frame for reduced motion, and renders nothing if WebGL is unavailable.
*/
export default function DayOrb({ className = '', progress = 0, energy = 1, options }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const api = useRef(null);
  const [ready, setReady] = useState(false);
  const { resolved } = useTheme();
  const opts = useRef(options);

  useEffect(() => {
    let cancelled = false;
    let ro, io;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let onScreen = true;
    const sync = () => {
      const a = api.current;
      if (!a) return;
      if (still) { a.renderOnce(); return; }
      if (onScreen && !document.hidden) a.start(); else a.stop();
    };
    const onVis = () => sync();

    import('./orbScene').then(({ createOrbScene }) => {
      if (cancelled || !canvas.current) return;
      try {
        api.current = createOrbScene(canvas.current, opts.current);
      } catch {
        return; // no WebGL: leave the page as it is
      }
      api.current.setTheme(readColors(), document.documentElement.dataset.theme === 'dark');
      const size = () => {
        const r = wrap.current.getBoundingClientRect();
        if (r.width && r.height) api.current.setSize(r.width, r.height);
        if (still) api.current.renderOnce();
      };
      size();
      ro = new ResizeObserver(size);
      ro.observe(wrap.current);
      io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); });
      io.observe(wrap.current);
      document.addEventListener('visibilitychange', onVis);
      sync();
      setReady(true);
    });
    return () => {
      cancelled = true;
      ro?.disconnect(); io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  /* theme colours come from the CSS tokens; read them after the theme attribute flips */
  useEffect(() => {
    const t = setTimeout(() => api.current?.setTheme(readColors(), resolved === 'dark'), 30);
    return () => clearTimeout(t);
  }, [resolved, ready]);
  useEffect(() => { api.current?.setProgress(progress); }, [progress, ready]);
  useEffect(() => { api.current?.setEnergy(energy); }, [energy, ready]);

  return (
    <div ref={wrap} aria-hidden="true" className={`pointer-events-none ${className}`}>
      <canvas ref={canvas} className={`block w-full h-full transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
