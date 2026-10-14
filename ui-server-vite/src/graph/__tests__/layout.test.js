import { describe, expect, it } from 'vitest';
import { anchor, layoutGraph, SIZES } from '../layout';
import { seededGraph } from './fixtures';

const at = (laid, id) => {
  const n = laid.nodes.find((x) => x.id === id);
  return { x: n.x, y: n.y };
};

const PROTO = {
  topic: { x: 350, y: 62 },
  d1: { x: 95, y: 215 }, d2: { x: 350, y: 215 }, d3: { x: 605, y: 215 },
  t1: { x: 225, y: 335 }, t2: { x: 480, y: 335 }, t3: { x: 700, y: 335 },
  m1: { x: 95, y: 455 }, m2: { x: 350, y: 455 }, m3: { x: 605, y: 455 },
  rahul: { x: 300, y: 555 }, aiko: { x: 430, y: 555 }, mei: { x: 560, y: 555 }, dewi: { x: 690, y: 555 },
};

const withoutHints = (g) => ({ ...g, nodes: g.nodes.map((n) => { const copy = { ...n }; delete copy.layoutHint; return copy; }) });

describe('layoutGraph', () => {
  it('puts seeded nodes at the prototype coordinates when the payload carries layout hints', () => {
    const laid = layoutGraph(seededGraph().nodes, seededGraph().edges);
    expect(laid.W).toBe(780);
    expect(laid.H).toBe(610);
    Object.entries(PROTO).forEach(([id, p]) => expect(at(laid, id)).toEqual(p));
  });

  it('derives the prototype coordinates for topic, decisions, tasks and meetings without hints', () => {
    const g = withoutHints(seededGraph());
    const laid = layoutGraph(g.nodes, g.edges);
    ['topic', 'd1', 'd2', 'd3', 't1', 't2', 't3', 'm1', 'm2', 'm3'].forEach((id) => {
      expect(at(laid, id)).toEqual(PROTO[id]);
    });
  });

  it('keeps people on the row, at least 130 apart and inside the canvas when no hints are sent', () => {
    const g = withoutHints(seededGraph());
    const laid = layoutGraph(g.nodes, g.edges);
    const xs = laid.nodes.filter((n) => n.kind === 'person').map((n) => n.x).sort((a, b) => a - b);
    expect(xs).toHaveLength(4);
    xs.forEach((x, i) => {
      expect(x).toBeGreaterThanOrEqual(22);
      expect(x).toBeLessThanOrEqual(laid.W - 22);
      if (i) expect(x - xs[i - 1]).toBeGreaterThanOrEqual(130);
    });
  });

  it('prefers layout_hint over the derived position', () => {
    const nodes = [
      { id: 'd1', kind: 'decision', orderKey: 1, layoutHint: { x: 500, y: 240 } },
      { id: 'd2', kind: 'decision', orderKey: 2 },
    ];
    const laid = layoutGraph(nodes, []);
    expect(at(laid, 'd1')).toEqual({ x: 500, y: 240 });
    expect(at(laid, 'd2')).toEqual({ x: 350, y: 215 });
  });

  it('places six decisions with no overlapping boxes', () => {
    const nodes = [{ id: 'topic', kind: 'topic', orderKey: 0 }];
    const edges = [];
    for (let i = 1; i <= 6; i += 1) {
      nodes.push({ id: `d${i}`, kind: 'decision', orderKey: i });
      nodes.push({ id: `t${i}`, kind: 'task', orderKey: i });
      nodes.push({ id: `m${i}`, kind: 'meeting', orderKey: i });
      edges.push({ id: `p${i}`, from: `d${i}`, to: `t${i}`, type: 'produced' });
      edges.push({ id: `c${i}`, from: `d${i}`, to: `m${i}`, type: 'decided' });
    }
    ['ana', 'ben', 'cho'].forEach((name, i) => {
      nodes.push({ id: name, kind: 'person', orderKey: i });
      edges.push({ id: `a${i}`, from: name, to: `m${i + 4}`, type: 'attended' });
    });
    const laid = layoutGraph(nodes, edges);
    const boxes = laid.nodes.map((n) => ({ id: n.id, l: n.x - n.w / 2, r: n.x + n.w / 2, t: n.y - n.h / 2, b: n.y + n.h / 2 }));
    const overlaps = [];
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
      if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) overlaps.push([a.id, b.id]);
    }));
    expect(overlaps).toEqual([]);
    expect(laid.W).toBe(95 + 255 * 5 + 160);
  });
});

describe('anchor', () => {
  it('stops a gap outside the box edge along the line to the other node', () => {
    const box = { x: 0, y: 0, w: 100, h: 40, kind: 'decision' };
    expect(anchor(box, { x: 200, y: 0 }, 3)).toEqual({ x: 53, y: 0 });
    expect(anchor(box, { x: 0, y: 100 }, 3)).toEqual({ x: 0, y: 23 });
  });

  it('uses the 22px radius for people', () => {
    expect(anchor({ x: 0, y: 0, kind: 'person' }, { x: 0, y: 100 }, 3)).toEqual({ x: 0, y: 25 });
    expect(SIZES.person.w).toBe(44);
  });
});
