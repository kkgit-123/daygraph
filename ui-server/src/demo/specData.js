// Hardcoded data for spec features that have no backend yet.
export const PEOPLE = {
  AM: { name: 'Arjun Mehta', bg: '#C9CEF8', color: '#1B2150' },
  PN: { name: 'Priya Nair', bg: '#FCE3B0', color: '#5A3A00' },
  SI: { name: 'Sana Iqbal', bg: '#CDEFE0', color: '#0D6148' },
  RK: { name: 'Rohan Kulkarni', bg: '#F9D5CC', color: '#7A2210' },
  AN: { name: 'Anika Rao', bg: '#E4D5F7', color: '#4A2480' },
};

export const MEETINGS = [
  {
    id: 'm1', title: 'Payments launch sync', when: 'Thu 9 Oct, 10:00', dur: '52 min', decisions: 3, tasks: 4, lang: 'English', people: ['PN', 'AM', 'SI', 'AN'],
    transcript: [
      { t: '04:10', who: 'AM', text: 'PSP certification slipped. The acquirer has not issued our test cards yet.' },
      { t: '12:40', who: 'PN', text: 'Then I do not want to promise the first of November to anyone.', dec: 'Launch date moves 1 Nov → 15 Nov' },
      { t: '13:02', who: 'AM', text: 'So the 15th of November works if certification lands by the 31st.' },
      { t: '22:15', who: 'SI', text: 'Legal needs the subprocessor list before we can sign the addendum.', dec: 'Legal confirms subprocessor list by 24 Oct' },
      { t: '31:48', who: 'PN', text: 'Arjun, please own the test cards follow-up. Due the 18th.', dec: 'Arjun owns acquirer test cards, due 18 Oct' },
      { t: '41:12', who: 'PN', text: 'Okay, so the new date is approved. Let us tell the partners on Monday.' },
    ],
    timeline: ['10:00 Meeting starts, transcript on', '10:13 Decision proposed: launch date', '10:22 Decision proposed: legal', '10:32 Decision proposed: test cards', '10:52 Transcript saved to Drive, review ready'],
  },
  {
    id: 'm2', title: 'Risk and fraud review', when: 'Tue 7 Oct, 15:00', dur: '38 min', decisions: 2, tasks: 2, lang: 'English', people: ['RK', 'AN', 'SI'],
    transcript: [
      { t: '09:30', who: 'RK', text: 'The vendor quote is about three times our estimate for the first release.' },
      { t: '22:05', who: 'AN', text: 'Let us go with the rules engine for v1 and revisit the vendor in Q1.', dec: 'Use in-house rules engine for v1' },
      { t: '30:20', who: 'RK', text: 'I will write up the rule thresholds by Friday.', dec: 'Rohan documents rule thresholds, due 10 Oct' },
    ],
    timeline: ['15:00 Meeting starts', '15:22 Decision proposed: rules engine', '15:30 Task proposed: thresholds', '15:38 Review ready'],
  },
  {
    id: 'm3', title: 'リリース計画レビュー (Japan rollout)', when: 'Mon 6 Oct, 09:00', dur: '30 min', decisions: 1, tasks: 1, lang: 'Japanese', people: ['PN', 'AN'],
    transcript: [
      { t: '14:20', who: 'PN', text: '東京リージョンでの展開は十二月に延期しましょう。', en: 'Let us postpone the Tokyo region rollout to December.', dec: 'Tokyo rollout moves to December' },
    ],
    timeline: ['09:00 Meeting starts', '09:14 Decision proposed (original quote kept)', '09:30 Review ready'],
  },
];

export const MANAGER = {
  stats: [['Decisions this week', '14', '+5 vs last week', 'ok'], ['Open conflicts', '1', 'Launch date', 'conflict'], ['Stalled tasks', '3', 'Older than 5 days', 'warn'], ['On-time rate', '86%', '+9 pts', 'ok']],
  blockers: [
    { title: 'PSP certification not started', owner: 'AM', age: '6 days', note: 'Waiting on acquirer test cards. Blocks launch date.' },
    { title: 'DPA subprocessor list', owner: 'SI', age: '4 days', note: 'Legal needs the final vendor list.' },
    { title: 'Partner announcement draft', owner: 'AN', age: '5 days', note: 'Depends on the confirmed launch date.' },
  ],
  members: [['AM', 'Arjun Mehta', 7, 3, 'Waiting on acquirer'], ['PN', 'Priya Nair', 5, 1, 'On track'], ['SI', 'Sana Iqbal', 4, 2, 'Waiting on vendor list'], ['RK', 'Rohan Kulkarni', 6, 0, 'On track']],
  brief: ['Status: amber. Launch moved from 1 Nov to 15 Nov, approved by Priya Nair on 9 Oct.', 'Blockers: PSP certification (due 31 Oct) and the DPA subprocessor list (due 24 Oct).', 'Decisions: 14 confirmed this week, 1 conflict resolved, 0 reversed.', 'Risk: two tasks still assume 1 Nov and need re-planning.', 'Ask: escalate acquirer test cards to the partner manager.'],
};

export const DISCOVER = [
  { kind: 'Releases', title: 'Gemini 2.5 Flash adds batch grounding with Google Search', src: 'cloud.google.com/blog', date: '8 Oct', why: 'You are batch-checking extracted quotes. This could cut that step\'s cost.', link: 'Linked to your idea: "Verify quotes in one call"' },
  { kind: 'Research', title: 'Verifying LLM citations with span-level entailment', src: 'arxiv.org', date: '7 Oct', why: 'Matches your quote verification step in the ingestion pipeline.', link: 'Linked to task: Quote verifier tests' },
  { kind: 'Tools', title: 'ADK 1.0: human-in-the-loop tool confirmation', src: 'github.com/google/adk-python', date: '6 Oct', why: 'The approval pattern you use for Gmail drafts is now built in.', link: '' },
  { kind: 'Opinions', title: 'Why decision logs beat meeting notes', src: 'news.ycombinator.com', date: '5 Oct', why: 'Adjacent topic, picked for serendipity.', link: '' },
  { kind: 'Releases', title: 'Spanner Graph: vector search inside GQL queries', src: 'cloud.google.com/spanner', date: '4 Oct', why: 'You query the decision graph and embeddings separately today.', link: 'Linked to your idea: "Semantic conflict candidates"' },
];

export const READING = [
  { title: 'Designing multi-agent systems on Vertex AI', domain: 'cloud.google.com', saved: 'Today', mins: 9, status: 'Summarised', tags: ['agents', 'vertex'], sum: 'Covers supervisor vs peer agent patterns, when to split tools across agents, and how Agent Engine manages sessions and memory.', why: 'Relevant to the Launch readiness agent task.' },
  { title: 'Property graph schema design tips', domain: 'spanner.dev', saved: 'Yesterday', mins: 6, status: 'Summarised', tags: ['graph'], sum: 'Model decisions as nodes, supersession as edges, and keep edge properties small for traversal speed.', why: 'Links to the decision lineage view.' },
  { title: 'Evaluating RAG answers with citations', domain: 'research.google', saved: '3 days ago', mins: 12, status: 'Summarised', tags: ['rag', 'eval'], sum: 'Proposes sentence-level attribution scoring and shows dropping uncited sentences raises trust without hurting recall.', why: 'Matches the Ask page rule: drop uncited sentences.' },
];

export const ADDONS = {
  chat: { title: 'Decision proposed: Launch date', body: 'Priya Nair said: "the new date is approved". Proposed: Launch moves from 1 Nov to 15 Nov. Conflicts with an active decision.', meta: 'Payments launch sync · 41:12' },
  gmail: { from: 'Sana Iqbal', subject: 'RE: PSP certification delay', body: 'I will send the updated vendor list to Legal by Friday, 24 Oct.', commit: 'Commitment detected: Sana Iqbal, send vendor list to Legal, due Fri 24 Oct' },
  cal: { event: 'Payments launch review', when: 'Fri 17 Oct, 11:00', warn: 'Agenda item "Confirm 1 Nov go-live" conflicts with the active decision "Launch moves to 15 Nov".', items: ['3 decisions linked to this series', '2 open tasks: test cards, DPA list'] },
  meet: ['Launch moves 1 Nov → 15 Nov (proposed)', 'Legal confirms subprocessor list (proposed)'],
};

export const ADMIN = {
  usage: [['Meetings analysed', '312'], ['Decisions proposed', '1,046'], ['Accepted rate', '82%'], ['Gemini cost this month', '$38.20'], ['Cost per meeting', '$0.12']],
  domains: ['abc.com', 'partners.abc.com'],
  retention: [['Transcripts', '90 days'], ['Decisions and tasks', 'Until deleted'], ['Private notes', 'Until user deletes'], ['Audit log', '1 year']],
  policies: [['Auto-add accepted decisions', false], ['Allow managers to see shared items only', true], ['Block external attendees from analysis', true], ['Data residency: asia-south1', true]],
  audit: [['10:42', 'Anika Rao', 'Accepted decision dec_launch_date'], ['10:40', 'Gemini', 'Extracted 3 decisions from mtg_payments_sync'], ['09:15', 'Admin', 'Changed retention for transcripts to 90 days'], ['09:02', 'Priya Nair', 'Exported brief to Google Docs']],
};
