// Hardcoded demo data for the Google Cloud / Search / Agent pages (no backend needed).
export const SERVICES = [
  { id: 'meet', group: 'Workspace', name: 'Google Meet', tag: 'Transcripts', color: '#00897B', status: 'connected', count: '42 meetings', detail: 'Transcripts land in Drive, then flow into decision extraction.' },
  { id: 'cal', group: 'Workspace', name: 'Google Calendar', tag: 'Schedule + focus blocks', color: '#1A73E8', status: 'connected', count: '18 events this week', detail: 'Focus blocks are written back around your meetings.' },
  { id: 'drive', group: 'Workspace', name: 'Google Drive + Docs', tag: 'Knowledge corpus', color: '#F9AB00', status: 'connected', count: '1,284 documents', detail: 'Specs, PRDs and runbooks are indexed with ACLs preserved.' },
  { id: 'gmail', group: 'Workspace', name: 'Gmail', tag: 'Threads + drafts', color: '#D93025', status: 'connected', count: '326 threads', detail: 'Agent drafts follow-ups. Nothing sends without approval.' },
  { id: 'tasks', group: 'Workspace', name: 'Google Tasks', tag: 'Action items', color: '#1A73E8', status: 'connected', count: '27 open tasks', detail: 'Accepted decisions create owned tasks.' },
  { id: 'gemini', group: 'Google Cloud', name: 'Gemini on Vertex AI', tag: 'gemini-2.5-pro / flash', color: '#4552E0', status: 'connected', count: '38k tokens today', detail: 'Extraction, grounding and drafting. Flash for chunks, Pro for conflicts.' },
  { id: 'vsearch', group: 'Google Cloud', name: 'Vertex AI Search', tag: 'Enterprise search', color: '#1A73E8', status: 'connected', count: '4 data stores', detail: 'Unified index over Drive, Gmail, Meet and Jira with per-user permissions.' },
  { id: 'docai', group: 'Google Cloud', name: 'Document AI', tag: 'Layout + OCR parser', color: '#34A853', status: 'connected', count: '212 PDFs parsed', detail: 'Contracts and scanned specs become structured, quotable text.' },
  { id: 'adk', group: 'Google Cloud', name: 'Agent Engine + ADK', tag: 'Agentic workflows', color: '#9334E6', status: 'connected', count: '3 agents deployed', detail: 'Launch Readiness agent plans, calls tools and waits for approval.' },
  { id: 'bq', group: 'Google Cloud', name: 'BigQuery', tag: 'Work analytics', color: '#4285F4', status: 'connected', count: '2.1M rows', detail: 'Decision, task and meeting events for cycle-time analysis.' },
  { id: 'spanner', group: 'Google Cloud', name: 'Spanner Graph / AlloyDB', tag: 'Decision graph', color: '#00ACC1', status: 'connected', count: '318 nodes, 904 edges', detail: 'Decisions, people, topics and conflicts stored as a property graph.' },
  { id: 'run', group: 'Google Cloud', name: 'Cloud Run', tag: 'Hosting', color: '#1A73E8', status: 'connected', count: 'rev daygraph-00042', detail: 'FastAPI and React served on Cloud Run, autoscaled to zero.' },
];

export const PIPELINE = [
  { title: 'Sources', items: ['Meet', 'Drive', 'Gmail', 'Calendar'] },
  { title: 'Ingest', items: ['Document AI', 'Chunk + verify quotes'] },
  { title: 'Reason', items: ['Gemini on Vertex', 'ADK agents'] },
  { title: 'Store', items: ['Spanner Graph', 'Vertex AI Search', 'BigQuery'] },
  { title: 'Surfaces', items: ['Today', 'Ask', 'Graph', 'Review'] },
];

export const BQ_WEEKS = [
  { w: 'W1', hours: 52 }, { w: 'W2', hours: 44 }, { w: 'W3', hours: 36 }, { w: 'W4', hours: 29 }, { w: 'W5', hours: 21 }, { w: 'W6', hours: 14 },
];

export const SOURCES = {
  meet: { label: 'Meet', color: '#00897B' },
  drive: { label: 'Drive', color: '#F9AB00' },
  gmail: { label: 'Gmail', color: '#D93025' },
  docs: { label: 'Docs', color: '#1A73E8' },
  jira: { label: 'Jira', color: '#0052CC' },
};

export const SEARCHES = {
  default: {
    q: 'When is the payments launch and who approved the date?',
    answer: [
      { t: 'The payments launch moved from 1 Nov to 15 Nov.', c: [1, 2] },
      { t: 'Priya Nair approved the new date in the 9 Oct launch sync, after the PSP sandbox certification slipped by two weeks.', c: [1, 3] },
      { t: 'Legal still has to confirm the revised data-processing addendum before the date is final.', c: [4] },
    ],
    results: [
      { n: 1, src: 'meet', title: 'Payments launch sync, 9 Oct', snip: '"Okay, so we are moving the launch to the 15th of November. Priya, you are good with that?" "Yes, approved."', who: 'Transcript, 41:12', score: 0.97 },
      { n: 2, src: 'drive', title: 'Payments Launch Plan v7', snip: 'Target go-live: 15 Nov (was 1 Nov). Dependency: PSP sandbox certification complete by 31 Oct.', who: 'Docs, edited by Arjun Mehta', score: 0.94 },
      { n: 3, src: 'gmail', title: 'RE: PSP certification delay', snip: 'Certification is now expected 31 Oct. I would not commit to 1 Nov, 15 Nov is safer.', who: 'Thread, 6 messages', score: 0.9 },
      { n: 4, src: 'docs', title: 'DPA addendum, legal review', snip: 'Open item: subprocessor list for the new PSP must be confirmed before launch.', who: 'Docs, comment by Legal', score: 0.86 },
      { n: 5, src: 'jira', title: 'PAY-482 PSP sandbox certification', snip: 'Status: In progress. Due 31 Oct. Blocked by: acquirer test cards.', who: 'Issue', score: 0.81 },
    ],
  },
  risk: {
    q: 'What are the open risks for the launch?',
    answer: [
      { t: 'The biggest risk is PSP sandbox certification, now due 31 Oct, which leaves two weeks before the new date.', c: [1, 3] },
      { t: 'Legal has an open item on the subprocessor list in the DPA addendum.', c: [2] },
      { t: 'Two decisions still conflict with the old 1 Nov plan and are waiting in Review.', c: [4] },
    ],
    results: [
      { n: 1, src: 'jira', title: 'PAY-482 PSP sandbox certification', snip: 'Blocked by: acquirer test cards. Due 31 Oct.', who: 'Issue', score: 0.95 },
      { n: 2, src: 'docs', title: 'DPA addendum, legal review', snip: 'Open item: subprocessor list must be confirmed before launch.', who: 'Docs, comment by Legal', score: 0.91 },
      { n: 3, src: 'gmail', title: 'RE: PSP certification delay', snip: 'I would not commit to 1 Nov, 15 Nov is safer.', who: 'Thread, 6 messages', score: 0.88 },
      { n: 4, src: 'meet', title: 'Payments launch sync, 9 Oct', snip: '"We still have two items in the plan that assume the first of November."', who: 'Transcript, 44:30', score: 0.84 },
    ],
  },
  budget: {
    q: 'What did we decide about the fraud-screening vendor?',
    answer: [
      { t: 'The team chose the in-house rules engine over the third-party vendor for the first release.', c: [1] },
      { t: 'The reason given was cost: the vendor quote was roughly three times the engineering estimate.', c: [2, 3] },
    ],
    results: [
      { n: 1, src: 'meet', title: 'Risk and fraud review, 7 Oct', snip: '"Let us go with the rules engine for v1 and revisit the vendor in Q1."', who: 'Transcript, 22:05', score: 0.96 },
      { n: 2, src: 'drive', title: 'Fraud vendor comparison', snip: 'Vendor A annual quote 180k vs in-house estimate 60k for v1 scope.', who: 'Sheets, tab Summary', score: 0.92 },
      { n: 3, src: 'gmail', title: 'Vendor A pricing follow-up', snip: 'Happy to discuss volume discounts, but the platform fee stays.', who: 'Thread, 3 messages', score: 0.83 },
    ],
  },
};

export const AGENT_STEPS = [
  { svc: 'Calendar', color: '#1A73E8', title: 'Read this week\'s calendar', out: '9 meetings found, 3 involve the payments launch.', ms: 900 },
  { svc: 'Vertex AI Search', color: '#1A73E8', title: 'Search Drive, Gmail and Meet for launch status', out: '14 relevant items across 4 sources, permission-filtered for Anika.', ms: 1300 },
  { svc: 'Document AI', color: '#34A853', title: 'Parse the scanned DPA addendum (PDF)', out: 'Extracted 6 clauses. Found open item: subprocessor list.', ms: 1200 },
  { svc: 'Spanner Graph', color: '#00ACC1', title: 'Query decision graph for conflicts', out: '1 conflict: launch date 1 Nov vs 15 Nov (2 downstream tasks affected).', ms: 1100 },
  { svc: 'BigQuery', color: '#4285F4', title: 'Compare cycle time against last 3 launches', out: 'Review-to-ship is 31% slower. Main cause: certification dependency.', ms: 1200 },
  { svc: 'Gemini on Vertex', color: '#4552E0', title: 'Draft the readiness brief and follow-ups', out: 'Brief written (1 page), 2 emails and 2 tasks proposed. Every claim cites a source.', ms: 1500 },
];

export const AGENT_ACTIONS = [
  { id: 'doc', svc: 'Docs', color: '#1A73E8', title: 'Launch readiness brief', body: 'Status: amber. Date moved to 15 Nov. Blockers: PSP certification (31 Oct), DPA subprocessor list. Recommendation: hold the 15 Nov date, escalate certification.', cta: 'Create Google Doc', done: 'Created in Drive / Payments launch / Readiness brief' },
  { id: 'mail', svc: 'Gmail', color: '#D93025', title: 'Draft to Legal (Sana Iqbal)', body: 'Hi Sana, can you confirm the subprocessor list for the new PSP by 24 Oct? It is the last open item on the DPA addendum before the 15 Nov launch.', cta: 'Save as Gmail draft', done: 'Draft saved in Gmail. Not sent.' },
  { id: 'task', svc: 'Tasks', color: '#1A73E8', title: 'Task: chase acquirer test cards', body: 'Owner: Arjun Mehta, due 18 Oct, linked to PAY-482 and the 9 Oct launch sync.', cta: 'Add to Google Tasks', done: 'Added to Google Tasks, owner Arjun Mehta.' },
  { id: 'cal', svc: 'Calendar', color: '#1A73E8', title: 'Focus block: certification follow-up', body: 'Thu 16 Oct, 14:00 to 15:30. Placed in your largest free slot, clear of meetings.', cta: 'Add to Calendar', done: 'Event created on Thu 16 Oct, 14:00.' },
];

// "Under the hood" details shown on demand, so judges can see the real Google calls behind each step.
export const UNDER_HOOD_SEARCH = {
  default: {
    engine: 'Vertex AI Search, data stores: drive-docs, gmail, meet-transcripts, jira',
    query: `{
  "query": "payments launch date approval",
  "userInfo": { "identifier": "anika.rao@persistent.com" },
  "filter": "acl_principal = \\"anika.rao@persistent.com\\"",
  "pageSize": 5,
  "contentSearchSpec": { "snippetSpec": { "returnSnippet": true } }
}`,
    model: 'gemini-2.5-pro on Vertex AI, grounded on the 5 results above',
    latency: '1.4 s search, 2.1 s grounded answer',
  },
  risk: {
    engine: 'Vertex AI Search, data stores: drive-docs, gmail, jira',
    query: `{
  "query": "launch risks blocker certification",
  "filter": "acl_principal = \\"anika.rao@persistent.com\\"",
  "pageSize": 4
}`,
    model: 'gemini-2.5-pro on Vertex AI, sentence-level citation check',
    latency: '1.1 s search, 1.9 s grounded answer',
  },
  budget: {
    engine: 'Vertex AI Search, data stores: meet-transcripts, drive-docs, gmail',
    query: `{
  "query": "fraud screening vendor rules engine decision",
  "filter": "acl_principal = \\"anika.rao@persistent.com\\"",
  "pageSize": 3
}`,
    model: 'gemini-2.5-pro on Vertex AI, sentence-level citation check',
    latency: '0.9 s search, 1.6 s grounded answer',
  },
};

export const UNDER_HOOD_AGENT = [
  { svc: 'Calendar', api: 'calendar.v3.events.list', detail: 'timeMin=2026-10-12, timeMax=2026-10-16, q="payments"' },
  { svc: 'Vertex AI Search', api: 'discoveryengine.v1.SearchService.Search', detail: 'datastore=drive-docs,gmail,meet; ACL filter applied' },
  { svc: 'Document AI', api: 'documentai.v1.Processor.ProcessDocument', detail: 'processor=layout-parser, input=dpa_addendum.pdf (scanned)' },
  { svc: 'Spanner Graph', api: 'GQL via Spanner client', detail: 'MATCH (d:Decision)-[:CONFLICTS_WITH]->(o:Decision) RETURN d, o' },
  { svc: 'BigQuery', api: 'bigquery.jobs.query', detail: "SELECT AVG(review_to_ship_days) FROM daygraph.launches WHERE team='payments'" },
  { svc: 'Gemini on Vertex', api: 'vertexai.generate_content', detail: 'model=gemini-2.5-pro, response_schema=ReadinessBrief, citations required' },
];
