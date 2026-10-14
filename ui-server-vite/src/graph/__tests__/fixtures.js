/* Seeded PROTO story as the API delivers it (camelCase after the client util).
   conflict: 'pending' | 'accepted' | 'both' | 'dismissed' */
export function seededGraph({ conflict = 'pending', hints = true } = {}) {
  const d2Superseded = conflict === 'accepted';
  const d3State = conflict === 'pending' ? 'pending' : conflict === 'dismissed' ? 'dismissed' : 'active';
  const conflictLabel = { pending: 'conflict?', accepted: 'supersedes', both: 'kept both' }[conflict];
  const person = (id, fullTitle, x, y, meta) => ({
    id, kind: 'person', title: fullTitle.split(' ').map((w) => w[0]).join(''), fullTitle, meta,
    orderKey: id, layoutHint: hints ? { x, y } : undefined,
  });
  const nodes = [
    { id: 'topic', kind: 'topic', title: 'Payments launch date', fullTitle: 'Payments launch date', meta: '3 decisions across 3 meetings', orderKey: 0 },
    { id: 'd1', kind: 'decision', title: 'Early November target', subtitle: '22 Sep, replaced', state: 'superseded', fullTitle: 'Target an early November launch', meta: 'Quarter planning, 22 Sep, Mei Chen', quote: 'Early November is the target. Let’s work back from there.', quoteClass: 'q-en', orderKey: 1 },
    { id: 'd2', kind: 'decision', title: 'Lock 1 November launch', subtitle: `3 Oct, ${d2Superseded ? 'replaced' : 'active'}`, state: d2Superseded ? 'superseded' : 'active', fullTitle: 'Lock the payments launch for 1 November', meta: 'Launch planning, 3 Oct, Rahul Menon, 10:10', quote: 'Let’s lock 1 November for the launch.', quoteClass: 'q-en', orderKey: 2 },
    { id: 'd3', kind: 'decision', title: 'Move launch to 15 Nov', subtitle: { pending: 'Today, to review', dismissed: 'Today, dismissed' }[conflict] || 'Today, active', state: d3State, fullTitle: 'Move the payments launch to 15 November', meta: 'Payments launch sync, today, Mei Chen, 23:40', quote: '決済ベンダーの認証が遅れているので、リリースは11月15日に延期しましょう。', quoteClass: 'q-jp', translation: 'Because the payments vendor’s certification is delayed, let’s postpone the release to 15 November.', orderKey: 3 },
    { id: 't1', kind: 'task', title: 'Draft checklist', state: 'done', fullTitle: 'Draft the launch checklist', meta: 'Done in Google Tasks', orderKey: 1 },
    { id: 't2', kind: 'task', title: 'Book vendor slot', state: 'done', fullTitle: 'Book the vendor certification slot', meta: 'Done in Google Tasks', orderKey: 2 },
    { id: 't3', kind: 'task', title: 'Release checklist', state: conflict === 'accepted' ? 'open' : 'planned', fullTitle: 'Update the release checklist for 15 Nov', meta: 'Created when you accept the decision', orderKey: 3 },
    { id: 'm1', kind: 'meeting', title: 'Quarter planning', fullTitle: 'Quarter planning', meta: '22 Sep, 4 attendees', orderKey: 1 },
    { id: 'm2', kind: 'meeting', title: 'Launch planning', fullTitle: 'Launch planning', meta: '3 Oct, 5 attendees', orderKey: 2 },
    { id: 'm3', kind: 'meeting', title: 'Payments launch sync', fullTitle: 'Payments launch sync', meta: 'Today, 5 attendees', orderKey: 3 },
    person('rahul', 'Rahul Menon', 300, 555, 'Product manager, Singapore'),
    person('aiko', 'Aiko Tanaka', 430, 555, 'Developer, Tokyo'),
    person('mei', 'Mei Chen', 560, 555, 'Team lead, Sydney'),
    person('dewi', 'Dewi Lestari', 690, 555, 'QA engineer, Jakarta'),
  ];
  const E = (from, to, type, extra = {}) => ({ id: `${from}-${to}-${type}`, from, to, type, ...extra });
  const edges = [
    E('d1', 'topic', 'about'), E('d2', 'topic', 'about'), E('d3', 'topic', 'about'),
    E('d2', 'd1', 'supersedes', { label: 'supersedes' }),
    ...(conflict === 'dismissed' ? [] : [E('d3', 'd2', 'supersedes', { conflict: true, label: conflictLabel })]),
    E('d1', 'm1', 'decided'), E('d2', 'm2', 'decided'), E('d3', 'm3', 'decided'),
    E('d1', 't1', 'produced'), E('d2', 't2', 'produced'), E('d3', 't3', 'produced'),
    E('rahul', 'm2', 'attended'), E('aiko', 'm2', 'attended'), E('aiko', 'm3', 'attended'),
    E('mei', 'm3', 'attended'), E('dewi', 'm3', 'attended'),
  ];
  return { topicId: 'topic', stats: { decisions: 3, links: edges.length, openConflicts: conflict === 'pending' ? 1 : 0 }, nodes, edges };
}
