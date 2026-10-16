/*
  Planned integration with Google Research's Deep Review. Not connected: DayGraph makes no Deep Review calls yet.
  The summary is our own wording of the public announcement; the findings are hand-written sample output.
*/
export const DEEP_REVIEW_SOURCE = {
  title: 'Analyzing technical documents with Deep Review',
  org: 'Google Research blog',
  date: '14 Oct 2026',
  url: 'https://research.google/blog/analyzing-technical-documents-with-deep-review/',
};

/* Key facts from the announcement, paraphrased */
export const DEEP_REVIEW_FACTS = [
  ['What it is', 'An agentic system that checks long technical documents for logical gaps, unsupported claims and inconsistencies, leaving the final judgement to people.'],
  ['Track record', 'Grew out of the Paper Assistant Tool, piloted on 16,000+ opt-in submissions at STOC, ICML, NeurIPS and ICLR.'],
  ['Beyond papers', 'Now aimed at design docs, presentations, and legal and financial documents.'],
  ['Access', 'Two free reviews a week, plus an API that uses your own Gemini API key for higher volume.'],
  ['Inputs', 'PDF and plain text today; multi-file review is announced as coming soon.'],
  ['Privacy', 'Uploaded documents are not used to train Google models.'],
];

/* The four stages, as DayGraph would show them */
export const DEEP_REVIEW_STAGES = [
  { key: 'seg', label: 'Segment', icon: 'layers', detail: 'Split into logical sections' },
  { key: 'budget', label: 'Budget', icon: 'chart', detail: 'More reasoning for dense sections' },
  { key: 'verify', label: 'Verify', icon: 'shield', detail: 'Parallel agents, full context' },
  { key: 'synth', label: 'Synthesize', icon: 'sparkles', detail: 'Cross-check and ground claims' },
];

export const SAMPLE_DOC = {
  title: 'Launch readiness brief',
  from: 'Drafted by the Launch readiness agent',
  sections: ['Status', 'Timeline', 'Blockers', 'Evidence', 'Recommendation'],
};

/* Hand-written sample findings for the demo brief. Not produced by Deep Review. */
export const SAMPLE_FINDINGS = [
  { id: 'f1', tone: 'conflict', kind: 'Inconsistency', section: 'Timeline',
    title: 'Two launch dates are still in circulation',
    body: 'The brief recommends holding 15 Nov, but the Quarter planning notes it links to still list 1 Nov as the target.',
    fix: 'Mark the 3 Oct decision as replaced in the linked notes, or cite the decision that supersedes it.' },
  { id: 'f2', tone: 'warn', kind: 'Unsupported claim', section: 'Evidence',
    title: '"Review-to-ship is 31% slower" has no source',
    body: 'The figure appears in the summary but no query, dashboard or document is cited for it.',
    fix: 'Link the BigQuery cycle-time result, or drop the number.' },
  { id: 'f3', tone: 'ai', kind: 'Unstated assumption', section: 'Blockers',
    title: 'Plan assumes test cards arrive by 18 Oct',
    body: 'Certification on 31 Oct depends on acquirer test cards, but there is no fallback if they slip.',
    fix: 'Add a fallback owner and the latest date that still keeps 15 Nov.' },
  { id: 'f4', tone: 'ok', kind: 'Verified', section: 'Blockers',
    title: 'Subprocessor list deadline matches the Legal email',
    body: '24 Oct in the brief matches the draft to Sana Iqbal and the DPA addendum item.',
    fix: null },
];

export const FITS = [
  { icon: 'bot', title: 'Before you approve agent output', body: 'Check the readiness brief and drafted emails before anything is created in Docs or Gmail.', to: '/agent' },
  { icon: 'chart', title: 'Decision briefs for managers', body: 'Verify the weekly brief against the decisions and tasks it summarises.', to: '/manager' },
  { icon: 'book', title: 'Design docs you save', body: 'Run a review on specs and proposals from Drive and keep the findings next to the link.', to: '/reading' },
  { icon: 'inbox', title: 'Decisions under review', body: 'Ground a contested decision against the documents and meetings behind it.', to: '/review' },
];

export const PLAN = [
  ['Export', 'DayGraph renders the brief or doc to PDF or plain text, the formats Deep Review accepts today.'],
  ['Review', 'The FastAPI server calls the Deep Review API with a Gemini API key kept in Secret Manager. The key never reaches the browser.'],
  ['Show', 'Findings appear inline in the approval step. High-severity issues block "Approve" until someone resolves or dismisses them.'],
  ['Record', 'Each review and its outcome is written to the audit log, linked to the decision graph.'],
];
