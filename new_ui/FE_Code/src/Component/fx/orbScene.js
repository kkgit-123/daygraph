/*
  The Day Orb: a slowly turning 3D graph. Nodes sit on a sphere, each linked to its nearest neighbours;
  signal pulses walk the graph like agents moving work along, and a small sun circles on an orbit
  (the same idea as the logo). Completed work turns nodes green: setProgress(0..1).
  Plain three.js with no React, loaded lazily so the main bundle stays small.
*/
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Clock, Color, Group, IcosahedronGeometry, LineBasicMaterial,
  LineLoop, LineSegments, NormalBlending, PerspectiveCamera, Points, Scene, ShaderMaterial, WebGLRenderer, WireframeGeometry,
} from 'three';

const VERT = /* glsl */`
  attribute float aSize; attribute vec3 aColor; attribute float aPhase;
  uniform float uTime; uniform float uPR; uniform float uTwinkle;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 1.0 - uTwinkle + uTwinkle * sin(uTime * 1.7 + aPhase);
    gl_PointSize = aSize * uPR * tw * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = mix(0.28, 1.0, smoothstep(-8.2, -4.2, mv.z)); /* far side of the sphere is dimmer */
  }`;
const FRAG = /* glsl */`
  uniform float uOpacity; varying vec3 vColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.7) * vAlpha * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }`;

const fib = (n, r) => {
  const out = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = g * i;
    const j = 1 + (Math.random() - 0.5) * 0.08;
    out.push([Math.cos(th) * rad * r * j, y * r * j, Math.sin(th) * rad * r * j]);
  }
  return out;
};

const pointsMaterial = (opacity, twinkle) => new ShaderMaterial({
  vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uOpacity: { value: opacity }, uTwinkle: { value: twinkle } },
});

export function createOrbScene(canvas, { nodes = 150, links = 3, pulses = 14, radius = 2, interactive = true, cameraZ = 6 } = {}) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = cameraZ;
  const root = new Group();
  root.rotation.x = 0.35;
  scene.add(root);

  /* --- nodes --- */
  const P = fib(nodes, radius);
  const pos = new Float32Array(nodes * 3);
  const col = new Float32Array(nodes * 3);
  const size = new Float32Array(nodes);
  const phase = new Float32Array(nodes);
  P.forEach((p, i) => {
    pos.set(p, i * 3);
    size[i] = 9 + Math.random() * 9 + (i % 17 === 0 ? 14 : 0); // a few hub nodes
    phase[i] = Math.random() * Math.PI * 2;
  });
  const nodeGeo = new BufferGeometry();
  nodeGeo.setAttribute('position', new BufferAttribute(pos, 3));
  nodeGeo.setAttribute('aColor', new BufferAttribute(col, 3));
  nodeGeo.setAttribute('aSize', new BufferAttribute(size, 1));
  nodeGeo.setAttribute('aPhase', new BufferAttribute(phase, 1));
  const nodeMat = pointsMaterial(1, 0.25);
  root.add(new Points(nodeGeo, nodeMat));

  /* --- edges: k nearest neighbours, de-duplicated --- */
  const adj = P.map(() => []);
  const seen = new Set();
  const edges = [];
  P.forEach((a, i) => {
    P.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2])
      .filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, links)
      .forEach(([j]) => {
        const k = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(k)) return;
        seen.add(k); edges.push([i, j]); adj[i].push(j); adj[j].push(i);
      });
  });
  const lpos = new Float32Array(edges.length * 6);
  const lcol = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], e) => { lpos.set(P[a], e * 6); lpos.set(P[b], e * 6 + 3); });
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new BufferAttribute(lpos, 3));
  lineGeo.setAttribute('color', new BufferAttribute(lcol, 3));
  const lineMat = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, blending: AdditiveBlending });
  root.add(new LineSegments(lineGeo, lineMat));

  /* --- inner core: faint wire icosahedron turning the other way --- */
  const coreGeo = new WireframeGeometry(new IcosahedronGeometry(radius * 0.42, 1));
  const coreMat = new LineBasicMaterial({ transparent: true, opacity: 0.16, depthWrite: false, blending: AdditiveBlending });
  const core = new LineSegments(coreGeo, coreMat);
  root.add(core);

  /* --- orbit ring with a travelling sun --- */
  const orbit = new Group();
  orbit.rotation.set(1.2, 0.2, 0.35);
  scene.add(orbit);
  const RING = 160, R2 = radius * 1.32;
  const rpos = new Float32Array(RING * 3);
  for (let i = 0; i < RING; i += 1) { const a = (i / RING) * Math.PI * 2; rpos.set([Math.cos(a) * R2, Math.sin(a) * R2, 0], i * 3); }
  const ringGeo = new BufferGeometry();
  ringGeo.setAttribute('position', new BufferAttribute(rpos, 3));
  const ringMat = new LineBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false });
  orbit.add(new LineLoop(ringGeo, ringMat));

  /* --- pulses: bright points walking the graph edge by edge --- */
  const ppos = new Float32Array(pulses * 3);
  const pcol = new Float32Array(pulses * 3);
  const psize = new Float32Array(pulses).fill(22);
  const pphase = new Float32Array(pulses);
  const pulseGeo = new BufferGeometry();
  pulseGeo.setAttribute('position', new BufferAttribute(ppos, 3));
  pulseGeo.setAttribute('aColor', new BufferAttribute(pcol, 3));
  pulseGeo.setAttribute('aSize', new BufferAttribute(psize, 1));
  pulseGeo.setAttribute('aPhase', new BufferAttribute(pphase, 1));
  const pulseMat = pointsMaterial(1, 0);
  root.add(new Points(pulseGeo, pulseMat));
  const sunGeo = new BufferGeometry();
  const sunPos = new Float32Array(3);
  sunGeo.setAttribute('position', new BufferAttribute(sunPos, 3));
  sunGeo.setAttribute('aColor', new BufferAttribute(new Float32Array(3), 3));
  sunGeo.setAttribute('aSize', new BufferAttribute(new Float32Array([48]), 1));
  sunGeo.setAttribute('aPhase', new BufferAttribute(new Float32Array(1), 1));
  const sunMat = pointsMaterial(1, 0.15);
  orbit.add(new Points(sunGeo, sunMat));

  const walkers = Array.from({ length: pulses }, () => {
    const a = Math.floor(Math.random() * nodes);
    return { a, b: adj[a][0] ?? a, prev: -1, t: Math.random(), dur: 1.2 + Math.random() * 1.4 };
  });

  /* --- colours / theme / progress --- */
  let colors = { a: new Color('#7AA7FF'), b: new Color('#A78BFA'), ok: new Color('#4ADE80'), sun: new Color('#FFD27A') };
  let progress = 0;
  let energy = 1;
  const order = P.map((_, i) => i).sort(() => Math.random() - 0.5); // which nodes turn green first
  const rank = new Int32Array(nodes);
  order.forEach((n, r) => { rank[n] = r; });

  const paint = () => {
    const c = new Color();
    for (let i = 0; i < nodes; i += 1) {
      const t = (P[i][1] / radius + 1) / 2;
      c.copy(colors.a).lerp(colors.b, t);
      if (rank[i] < progress * nodes) c.copy(colors.ok);
      col.set([c.r, c.g, c.b], i * 3);
    }
    nodeGeo.attributes.aColor.needsUpdate = true;
    edges.forEach(([a, b], e) => {
      lcol.set(col.subarray(a * 3, a * 3 + 3), e * 6);
      lcol.set(col.subarray(b * 3, b * 3 + 3), e * 6 + 3);
    });
    lineGeo.attributes.color.needsUpdate = true;
    const w = new Color('#ffffff').lerp(colors.b, 0.35);
    for (let i = 0; i < pulses; i += 1) pcol.set([w.r, w.g, w.b], i * 3);
    pulseGeo.attributes.aColor.needsUpdate = true;
    sunGeo.attributes.aColor.array.set([colors.sun.r, colors.sun.g, colors.sun.b]);
    sunGeo.attributes.aColor.needsUpdate = true;
    coreMat.color.copy(colors.b);
    ringMat.color.copy(colors.a);
  };

  const setTheme = (cssColors, dark) => {
    colors = {
      a: new Color(cssColors.accent), b: new Color(cssColors.ai), ok: new Color(cssColors.ok),
      sun: new Color(dark ? '#FFD27A' : '#F29900'),
    };
    /* additive glow on dark; normal blending on light so colours do not wash out to white */
    const blend = dark ? AdditiveBlending : NormalBlending;
    [nodeMat, pulseMat, sunMat, lineMat, coreMat].forEach((m) => { m.blending = blend; m.needsUpdate = true; });
    lineMat.opacity = dark ? 0.3 : 0.38;
    coreMat.opacity = dark ? 0.16 : 0.22;
    ringMat.opacity = dark ? 0.22 : 0.35;
    paint();
  };

  /* --- pointer parallax --- */
  const target = { x: 0, y: 0 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  };
  if (interactive) window.addEventListener('pointermove', onMove, { passive: true });

  /* --- loop --- */
  const clock = new Clock(false);
  let raf = 0;
  let spin = 0;
  let sunA = 0;
  const step = (dt) => {
    const t = clock.elapsedTime;
    spin += dt * 0.09 * energy;
    root.rotation.y = spin + target.x * 0.35;
    root.rotation.x += ((0.35 + target.y * 0.25) - root.rotation.x) * 0.04;
    core.rotation.y = -spin * 1.6;
    core.rotation.z = spin * 0.6;
    sunA += dt * 0.45 * energy;
    sunPos.set([Math.cos(sunA) * R2, Math.sin(sunA) * R2, 0]);
    sunGeo.attributes.position.needsUpdate = true;
    walkers.forEach((w, i) => {
      w.t += (dt * energy) / w.dur;
      if (w.t >= 1) {
        const next = adj[w.b].filter((n) => n !== w.a);
        w.prev = w.a; w.a = w.b; w.b = next.length ? next[Math.floor(Math.random() * next.length)] : w.prev; w.t = 0;
      }
      const a = P[w.a], b = P[w.b], k = w.t;
      ppos.set([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], i * 3);
    });
    pulseGeo.attributes.position.needsUpdate = true;
    [nodeMat, pulseMat, sunMat].forEach((m) => { m.uniforms.uTime.value = t; });
  };
  const frame = () => {
    raf = requestAnimationFrame(frame);
    step(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  };

  paint();
  return {
    setTheme,
    setProgress: (p) => { progress = Math.max(0, Math.min(1, p || 0)); paint(); },
    setEnergy: (e) => { energy = e; },
    setSize: (w, h) => {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      [nodeMat, pulseMat, sunMat].forEach((m) => { m.uniforms.uPR.value = pr * Math.min(1.25, Math.max(0.55, h / 420)); });
    },
    renderOnce: () => { step(0); renderer.render(scene, camera); },
    start: () => { if (raf) return; clock.start(); frame(); },
    stop: () => { cancelAnimationFrame(raf); raf = 0; clock.stop(); },
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      [nodeGeo, lineGeo, coreGeo, ringGeo, pulseGeo, sunGeo].forEach((g) => g.dispose());
      [nodeMat, lineMat, coreMat, ringMat, pulseMat, sunMat].forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
