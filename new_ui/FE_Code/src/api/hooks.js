import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../apiConfig';
import { apiGet, apiPatch, apiPost, apiPut, request } from './client';
import { useUi } from '../context/contexts';

const key = {
  me: ['me'], day: (d) => ['day', d], impact: ['impact'], decisions: (s) => ['decisions', s],
  graph: (t) => ['graph', t ?? null], source: (r) => ['source', r], suggestions: ['ask-suggestions'],
  ideas: ['ideas'], note: (s, d) => ['note', s, d ?? null], links: ['links'],
};

/* every decision mutation refreshes badge, stat strip, graph, thumbnail, day, sources */
function useInvalidateAll() {
  const qc = useQueryClient();
  return useCallback(() => Promise.all(
    ['decisions', 'graph', 'me', 'day', 'impact', 'source'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
  ), [qc]);
}

/* ---------- manager view (demo) ---------- */
export const useTeam = () => useQuery({ queryKey: ['team'], queryFn: () => apiGet(API_ENDPOINTS.team), retry: false });

export function useResetDemo() {
  const qc = useQueryClient();
  const { flash } = useUi();
  return useMutation({
    mutationFn: () => apiPost(API_ENDPOINTS.devReset),
    onSuccess: () => { flash('Demo data reset to the sample story.'); qc.invalidateQueries(); },
  });
}

/* ---------- session / day ---------- */
export const useMe = () => useQuery({ queryKey: key.me, queryFn: () => apiGet(API_ENDPOINTS.me) });

export const useDay = (date) => useQuery({
  queryKey: key.day(date), queryFn: () => apiGet(API_ENDPOINTS.day(date)), enabled: !!date,
});

export const useImpact = () => useQuery({ queryKey: key.impact, queryFn: () => apiGet(API_ENDPOINTS.impact) });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) => apiPatch(API_ENDPOINTS.meSettings, patch),
    onSettled: () => qc.invalidateQueries({ queryKey: key.me }),
  });
}

/* ---------- settings: connections, export, account ---------- */
export function useConnection() {
  const qc = useQueryClient();
  const { flash } = useUi();
  const onDone = (msg) => ({
    onSuccess: () => flash(msg),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: key.me }), qc.invalidateQueries({ queryKey: key.impact })]),
  });
  const enable = useMutation({ mutationFn: (service) => apiPost(API_ENDPOINTS.connectionEnable(service)), ...onDone('Connected.') });
  const disable = useMutation({ mutationFn: (service) => request('DELETE', API_ENDPOINTS.connection(service)), ...onDone('Disconnected. DayGraph stops reading that service.') });
  return { enable, disable };
}

export function useExportData() {
  const { flash } = useUi();
  return useMutation({
    meta: { silent: true },
    mutationFn: () => apiGet(API_ENDPOINTS.meExport),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'daygraph-export.json';
      a.click();
      URL.revokeObjectURL(url);
      flash('Your data export is downloaded.');
    },
  });
}

export function useDeleteAccount() {
  return useMutation({ meta: { silent: true }, mutationFn: () => request('DELETE', API_ENDPOINTS.meAccount) });
}

/* ---------- tasks ---------- */
const patchDay = (day, id, patch) => {
  if (!day) return day;
  const upd = (t) => (t.id === id ? { ...t, ...patch } : t);
  return { ...day, priorities: day.priorities?.map(upd), tasks: day.tasks?.map(upd) };
};

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => apiPatch(API_ENDPOINTS.task(id), patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['day'] });
      const prev = qc.getQueriesData({ queryKey: ['day'] });
      qc.setQueriesData({ queryKey: ['day'] }, (d) => patchDay(d, id, patch));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['day'] }), qc.invalidateQueries({ queryKey: key.impact }),
    ]),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPost(API_ENDPOINTS.tasks, body),
    onSettled: () => qc.invalidateQueries({ queryKey: ['day'] }),
  });
}

export function useReplan() {
  const qc = useQueryClient();
  const { flash, setReplanToken } = useUi();
  return useMutation({
    mutationFn: (date) => apiPost(API_ENDPOINTS.replan, date ? { date } : {}),
    onSuccess: (data) => {
      setReplanToken(data?.undoToken ?? null);
      flash(data?.message || 'Replanned: moved 1 block by 15 minutes. Nothing was dropped.');
      qc.invalidateQueries({ queryKey: ['day'] });
    },
  });
}

export function useUndoReplan() {
  const qc = useQueryClient();
  const { flash, replanToken, setReplanToken } = useUi();
  return useMutation({
    mutationFn: () => apiPost(API_ENDPOINTS.undoReplan, { undoToken: replanToken }),
    onSuccess: (data) => {
      setReplanToken(null);
      flash(data?.message || 'Back to the earlier plan.');
      qc.invalidateQueries({ queryKey: ['day'] });
    },
  });
}

/* ---------- decisions ---------- */
export const useDecisions = (status = 'all') => useQuery({
  queryKey: key.decisions(status), queryFn: () => apiGet(API_ENDPOINTS.decisions, { status }),
});

const NEXT_STATE = { accept: 'accepted', keep_both: 'accepted', dismiss: 'dismissed', undo: 'pending' };

/* Moves one decision to `state` in every cached review list and keeps the sidebar badge in step (DG-F26). */
async function optimisticDecision(qc, id, state) {
  await qc.cancelQueries({ queryKey: ['decisions'] });
  await qc.cancelQueries({ queryKey: key.me });
  const prev = qc.getQueriesData({ queryKey: ['decisions'] });
  const meBefore = qc.getQueryData(key.me);
  const old = prev.flatMap(([, d]) => d?.items || []).find((d) => d.id === id)?.state;
  qc.setQueriesData({ queryKey: ['decisions'] }, (d) => (d?.items
    ? { ...d, items: d.items.map((x) => (x.id === id ? { ...x, state } : x)) }
    : d));
  if (meBefore && old) {
    const delta = (state === 'pending' ? 1 : 0) - (old === 'pending' ? 1 : 0);
    if (delta) qc.setQueryData(key.me, { ...meBefore, reviewCount: Math.max(0, (meBefore.reviewCount || 0) + delta) });
  }
  return { prev, meBefore };
}

function rollbackDecisions(qc, ctx) {
  ctx?.prev.forEach(([k, d]) => qc.setQueryData(k, d));
  if (ctx?.meBefore) qc.setQueryData(key.me, ctx.meBefore);
}

function useDecisionAction(action, onSuccessMsg) {
  const qc = useQueryClient();
  const invalidate = useInvalidateAll();
  const { flash } = useUi();
  return useMutation({
    mutationFn: ({ id, body }) => apiPost(API_ENDPOINTS.decisionAction(id, action), body),
    onMutate: ({ id }) => optimisticDecision(qc, id, NEXT_STATE[action]),
    onError: (_e, _v, ctx) => rollbackDecisions(qc, ctx),
    onSuccess: (data, vars) => {
      const msg = typeof onSuccessMsg === 'function' ? onSuccessMsg(data, vars) : onSuccessMsg;
      if (msg) flash(msg);
    },
    onSettled: invalidate,
  });
}

export const useAcceptDecision = () => useDecisionAction('accept', (_d, v) => v.message || 'Task added to Google Tasks.');
export const useKeepBoth = () => useDecisionAction('keep_both', 'Both decisions kept and linked.');
export const useDismiss = () => useDecisionAction('dismiss', 'Dismissed. It stays in the audit log.');
export const useSetOwner = () => useDecisionAction('owner', null);

export function useUndoDecision() {
  const qc = useQueryClient();
  const invalidate = useInvalidateAll();
  const { flash } = useUi();
  return useMutation({
    meta: { silent: true },
    mutationFn: ({ id }) => apiPost(API_ENDPOINTS.decisionAction(id, 'undo')),
    onMutate: ({ id }) => optimisticDecision(qc, id, NEXT_STATE.undo),
    onSuccess: () => flash('Undone. The Google Task was removed.'),
    onError: (e, _v, ctx) => {
      rollbackDecisions(qc, ctx);
      flash(e.code === 'UNDO_EXPIRED' ? 'Too late to undo.' : e.message);
    },
    onSettled: invalidate,
  });
}

export function useAcceptAll() {
  const invalidate = useInvalidateAll();
  const { flash } = useUi();
  return useMutation({
    mutationFn: () => apiPost(API_ENDPOINTS.acceptAll),
    onSuccess: (data) => flash(`${data?.accepted ?? 0} tasks added to Google Tasks.`),
    onSettled: invalidate,
  });
}

/* ---------- graph ---------- */
export const useGraph = (topicId) => useQuery({
  queryKey: key.graph(topicId), queryFn: () => apiGet(API_ENDPOINTS.graph, { topicId }),
});

/* ---------- ask ---------- */
export const useSuggestions = () => useQuery({
  queryKey: key.suggestions,
  queryFn: () => apiGet(API_ENDPOINTS.askSuggestions),
  select: (d) => (Array.isArray(d) ? d : d?.items || d?.suggestions || [])
    .map((s) => (typeof s === 'string' ? s : s.text || s.question)).filter(Boolean),
});

export const useAsk = () => useMutation({
  meta: { silent: true },
  mutationFn: ({ question, scope }) => apiPost(API_ENDPOINTS.ask, { question, scope }),
});

/* Runs a question and stores the result in UiContext so it survives navigation. */
export function useAskFlow() {
  const ask = useAsk();
  const { setAsk, setCiteN } = useUi();
  const { mutateAsync } = ask;
  const run = useCallback(async (question, scope) => {
    setCiteN(null);
    setAsk({ question, answer: null, status: 'loading' });
    try {
      const answer = await mutateAsync({ question, scope });
      setAsk({ question, answer, status: 'done' });
    } catch (e) {
      setAsk({ question, answer: null, status: 'error', error: e.message });
    }
  }, [mutateAsync, setAsk, setCiteN]);
  return run;
}

export const useSource = (refId, placeholder) => useQuery({
  queryKey: key.source(refId), queryFn: () => apiGet(API_ENDPOINTS.source(refId)),
  enabled: !!refId, placeholderData: placeholder,
});

/* ---------- ideas / notes / links ---------- */
export const useIdeas = () => useQuery({
  queryKey: key.ideas, queryFn: () => apiGet(API_ENDPOINTS.ideas), select: (d) => d?.items || [],
});

export function useIdeaToTask() {
  const qc = useQueryClient();
  const { flash } = useUi();
  return useMutation({
    mutationFn: (id) => apiPost(API_ENDPOINTS.ideaToTask(id)),
    onSuccess: (data) => flash(data?.title ? `Task added: ${data.title}` : 'Task added to today.'),
    onSettled: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['day'] }), qc.invalidateQueries({ queryKey: key.ideas }),
    ]),
  });
}

export function useCreateIdea() {
  const qc = useQueryClient();
  const { flash } = useUi();
  return useMutation({
    mutationFn: (text) => apiPost(API_ENDPOINTS.ideas, { text }),
    onSuccess: () => flash('Idea saved. You can find it later in Ask.'),
    onSettled: () => qc.invalidateQueries({ queryKey: key.ideas }),
  });
}

export const useNote = (scope, date) => useQuery({
  queryKey: key.note(scope, date), queryFn: () => apiGet(API_ENDPOINTS.note(scope), { date }),
});

export function useSaveNote(scope, date) {
  const qc = useQueryClient();
  const timer = useRef(null);
  const [status, setStatus] = useState('idle');
  const m = useMutation({
    mutationFn: (text) => apiPut(API_ENDPOINTS.note(scope), { text, date }),
    onSuccess: (data) => { qc.setQueryData(key.note(scope, date), data); setStatus('saved'); },
  });
  const { mutate } = m;
  const unsaved = useRef(null);
  /* leaving the editor (scope switch, day change) saves what is still pending instead of dropping it */
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (unsaved.current !== null) mutate(unsaved.current);
  }, [mutate]);
  const save = useCallback((text) => {
    setStatus('pending');
    unsaved.current = text;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { unsaved.current = null; mutate(text); }, 1000);
  }, [mutate]);
  return { save, status };
}

export const useLinks = () => useQuery({
  queryKey: key.links, queryFn: () => apiGet(API_ENDPOINTS.links), select: (d) => d?.items || [],
});

export function useCreateLink() {
  const qc = useQueryClient();
  const { flash } = useUi();
  return useMutation({
    mutationFn: (url) => apiPost(API_ENDPOINTS.links, { url }),
    onSuccess: (data) => flash(data?.status === 'metadata_only' ? 'Saved. DayGraph could only read the title.' : 'Link saved to your reading list.'),
    onSettled: () => qc.invalidateQueries({ queryKey: key.links }),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  const { flash } = useUi();
  return useMutation({
    mutationFn: (id) => request('DELETE', API_ENDPOINTS.link(id)),
    onSuccess: () => flash('Removed from saved reading.'),
    onSettled: () => qc.invalidateQueries({ queryKey: key.links }),
  });
}
