/*
  One document-level pointer listener feeds --mx / --my to whichever .spotlight card is under the cursor.
  Updates are batched to one per animation frame; no React state is involved.
*/
let installed = false;

export function installSpotlight() {
  if (installed || typeof document === 'undefined') return;
  if (window.matchMedia?.('(hover: none)').matches) return; // touch screens: no hover light
  installed = true;
  let last = null;
  let frame = 0;
  const apply = () => {
    frame = 0;
    const el = last?.target?.closest?.('.spotlight');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${last.clientX - r.left}px`);
    el.style.setProperty('--my', `${last.clientY - r.top}px`);
  };
  document.addEventListener('pointermove', (e) => {
    last = e;
    if (!frame) frame = requestAnimationFrame(apply);
  }, { passive: true });
}
