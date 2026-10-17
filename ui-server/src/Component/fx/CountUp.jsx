import { useEffect, useState } from 'react';

/* Counts the first number in a label up from zero ("9 of 11" -> 0..9 of 11). Text without a number is shown as is. */
export default function CountUp({ value, ms = 900 }) {
  const text = String(value ?? '');
  const m = /^(\D*)(\d+)(.*)$/s.exec(text);
  const target = m ? Number(m[2]) : null;
  const [n, setN] = useState(0);
  const [still] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (target == null || still) return undefined;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / ms);
      setN(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, still]);

  if (!m) return text;
  return <><span className="sr-only">{text}</span><span aria-hidden="true">{m[1]}{still ? target : n}{m[3]}</span></>;
}
