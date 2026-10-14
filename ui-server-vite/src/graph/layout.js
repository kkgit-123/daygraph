/* Pure layout for the decision graph (DG-F40). Coordinates are node CENTRES, as in the prototype. No I/O. */
export const CANVAS_H = 610;
export const SIZES = {
  topic: { w: 210, h: 42 },
  decision: { w: 150, h: 72 },
  task: { w: 150, h: 38 },
  meeting: { w: 140, h: 52 },
  person: { w: 44, h: 44 },
};

/* numbers compare numerically, anything else as text */
export const cmpOrder = (a, b) => {
  const x = a.orderKey, y = b.orderKey;
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x ?? '').localeCompare(String(y ?? ''));
};
const mean = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
const hasHint = (n) => !!n.layoutHint && typeof n.layoutHint.x === 'number' && typeof n.layoutHint.y === 'number';

export function layoutGraph(nodes = [], edges = []) {
  const decisions = nodes.filter((n) => n.kind === 'decision').slice().sort(cmpOrder);
  const n = decisions.length;
  const W = Math.max(780, 95 + 255 * Math.max(n - 1, 0) + 160);
  const pos = {};

  decisions.forEach((d, i) => { pos[d.id] = { x: 95 + 255 * i, y: 215 }; });
  const decXs = decisions.map((d) => pos[d.id].x);

  nodes.filter((x) => x.kind === 'topic').forEach((t) => {
    pos[t.id] = { x: mean(decXs) ?? W / 2, y: 62 };
  });

  // tasks sit under the decision that produced them, one row per extra task
  const taskCount = {};
  nodes.filter((x) => x.kind === 'task').forEach((t) => {
    const e = edges.find((ed) => ed.type === 'produced' && ed.to === t.id && pos[ed.from]);
    const k = e ? (taskCount[e.from] = (taskCount[e.from] ?? -1) + 1) : 0;
    pos[t.id] = { x: e ? Math.min(pos[e.from].x + 130, W - 80) : W / 2, y: 335 + 46 * k };
  });

  // meetings at the mean x of the decisions they decided
  nodes.filter((x) => x.kind === 'meeting').forEach((m, i) => {
    const xs = edges.filter((ed) => ed.type === 'decided' && ed.to === m.id && pos[ed.from]).map((ed) => pos[ed.from].x);
    pos[m.id] = { x: mean(xs) ?? 95 + 255 * i, y: 455 };
  });

  // people: at the mean x of attended meetings, >= 130 apart, kept inside [22, W-22]
  const people = nodes.filter((x) => x.kind === 'person').map((p, i) => {
    const xs = edges.filter((ed) => ed.type === 'attended' && ed.from === p.id && pos[ed.to]).map((ed) => pos[ed.to].x);
    return { p, i, want: mean(xs) ?? W / 2 };
  }).sort((a, b) => a.want - b.want || a.i - b.i);
  const xs = [];
  people.forEach(({ want }, i) => xs.push(i ? Math.max(want, xs[i - 1] + 130) : want));
  const maxX = W - 22;
  for (let i = xs.length - 1; i >= 0; i -= 1) {
    xs[i] = Math.min(xs[i], i === xs.length - 1 ? maxX : xs[i + 1] - 130);
  }
  for (let i = 0; i < xs.length; i += 1) xs[i] = Math.max(xs[i], i ? xs[i - 1] + 130 : 22);
  people.forEach(({ p }, i) => { pos[p.id] = { x: Math.round(xs[i]), y: 555 }; });

  const laid = nodes.map((nd) => {
    const s = SIZES[nd.kind] || SIZES.task;
    const p = hasHint(nd) ? nd.layoutHint : pos[nd.id] || { x: W / 2, y: 300 };
    return { ...nd, x: p.x, y: p.y, w: s.w, h: s.h };
  });
  return { W, H: CANVAS_H, nodes: laid };
}

/* ---- geometry (copied from the prototype) ---- */
export function anchor(n, o, gap) {
  const dx = o.x - n.x, dy = o.y - n.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  let t;
  if (n.kind === 'person') t = 22;
  else {
    const sx = dx === 0 ? 1e9 : (n.w / 2) / Math.abs(dx);
    const sy = dy === 0 ? 1e9 : (n.h / 2) / Math.abs(dy);
    t = Math.min(sx, sy) * len;
  }
  const d = t + gap;
  return { x: n.x + (dx / len) * d, y: n.y + (dy / len) * d };
}

export function edgeGeometry(a, b) {
  const p = anchor(a, b, 3), q = anchor(b, a, 3);
  const dx = q.x - p.x, dy = q.y - p.y;
  return { p, q, len: Math.sqrt(dx * dx + dy * dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

export const lineStyle = (g, color, h, dashed, op) => ({
  position: 'absolute', left: g.p.x, top: g.p.y - h / 2, width: g.len, height: h,
  background: dashed ? `repeating-linear-gradient(90deg,${color} 0 7px,transparent 7px 12px)` : color,
  transformOrigin: '0 50%', transform: `rotate(${g.angle.toFixed(2)}deg)`, opacity: op,
});

export const arrowStyle = (g, color, op) => ({
  position: 'absolute', width: 0, height: 0, left: g.q.x - 10, top: g.q.y - 5,
  borderLeft: `10px solid ${color}`, borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
  transformOrigin: '10px 5px', transform: `rotate(${g.angle.toFixed(2)}deg)`, opacity: op,
});

export const REL = {
  about: { text: 'about', fwd: 'About', back: 'Decisions on this topic' },
  supersedes: { text: 'supersedes', fwd: 'Replaces', back: 'Replaced by' },
  decided: { text: 'decided in', fwd: 'Decided in', back: 'Decisions made here' },
  produced: { text: 'produced', fwd: 'Produced the task', back: 'Produced by' },
  attended: { text: 'attended', fwd: 'Attended', back: 'Attendee' },
};

export const edgeLook = (e, selId, mini) => {
  const incident = e.from === selId || e.to === selId;
  if (e.conflict && e.label === 'conflict?') return { color: '#C23B22', h: 3, dashed: true, op: 1 };
  if (e.conflict && e.label === 'kept both') return { color: '#7A809A', h: 2, dashed: true, op: 1 };
  if (mini) return { color: '#9AA1BC', h: 3, dashed: false, op: 1 };
  if (incident) return { color: '#3540D3', h: 3, dashed: false, op: 1 };
  return { color: '#AEB4CB', h: 1.5, dashed: false, op: 0.55 };
};
