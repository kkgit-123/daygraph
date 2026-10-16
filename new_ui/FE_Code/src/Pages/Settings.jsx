import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../Component/layout/PageHeader';
import Button from '../Component/ui/Button';
import Chip from '../Component/ui/Chip';
import Field from '../Component/ui/Field';
import Panel from '../Component/ui/Panel';
import Switch from '../Component/ui/Switch';
import { ThemeSegment } from '../Component/layout/ThemeSwitcher';
import { ErrorBox, Skeleton } from '../Component/ui/States';
import { useConnection, useDeleteAccount, useExportData, useMe, useResetDemo, useUpdateSettings } from '../api/hooks';
import { apiGet } from '../api/client';
import { API_ENDPOINTS } from '../apiConfig';
import { useSession, useUi } from '../context/contexts';
import { DEV_TOOLS } from '../demo/devTools';

const REASON = {
  expired: 'the sign-in link expired. Try again.',
  cancelled: 'the request was cancelled.',
  domain: 'that Google account is outside your workspace domain.',
  no_refresh_token: 'Google did not return access. Remove DayGraph from your Google account and try again.',
  not_configured: 'Google is not set up on this server yet.',
};

const SERVICE_LABEL = { calendar: 'Calendar', meet: 'Meet transcripts', tasks: 'Google Tasks', drive: 'Drive and Docs' };


function Section({ title, note, children }) {
  return (
    <Panel as="section" className="p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-[15.5px] font-semibold">{title}</h2>
        {note && <p className="text-muted text-[13.5px] mt-1">{note}</p>}
      </div>
      {children}
    </Panel>
  );
}

/* Time and timezone fields save on blur, so typing does not send a request per keystroke. */
function TimeField({ label, value, onSave }) {
  const [draft, setDraft] = useState(value || '');
  return (
    <label className="flex flex-col gap-1.5 text-[13.5px] font-semibold">
      {label}
      <Field type="time" value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft && draft !== value) onSave(draft); }} />
    </label>
  );
}

function DevTools() {
  const [state, setState] = useState(() => Object.fromEntries(DEV_TOOLS.map((t) => [t.id, t.status])));
  const { flash } = useUi();
  const toggle = (t) => {
    const on = state[t.id] !== 'connected';
    setState((st) => ({ ...st, [t.id]: on ? 'connected' : 'off' }));
    flash(on ? `${t.name} connected.` : `${t.name} disconnected.`);
  };
  return (
    <ul className="flex flex-col">
      {DEV_TOOLS.map((t) => {
        const on = state[t.id] === 'connected';
        return (
          <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 border-t border-divider first:border-t-0">
            <span className="w-8 h-8 rounded-[9px] text-white font-semibold text-[13px] inline-flex items-center justify-center shrink-0" style={{ background: t.color }}>{t.name[0]}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{t.name}</div>
              <div className="text-muted text-[13px]">{on ? t.detail : t.sync}</div>
            </div>
            <span className="text-muted text-[13px]">{on ? 'Connected' : 'Not connected'}</span>
            <Button variant={on ? 'secondary' : 'primary'} size="sm" onClick={() => toggle(t)}>{on ? 'Disconnect' : 'Connect'}</Button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Settings() {
  const { data: me, isLoading, error, refetch } = useMe();
  const { logout } = useSession();
  const { flash } = useUi();
  const navigate = useNavigate();
  const settings = useUpdateSettings();
  const conn = useConnection();
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  const resetDemo = useResetDemo();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [params, setParams] = useSearchParams();

  /* Google sends the browser back here after consent (see GET /auth/google/callback) */
  useEffect(() => {
    const result = params.get('google');
    if (!result) return;
    if (result === 'connected') flash('Google connected.');
    else flash(`Could not connect Google: ${REASON[params.get('reason')] || 'please try again.'}`);
    setParams({}, { replace: true });
  }, [params, setParams, flash]);

  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  if (isLoading || !me) return <Skeleton className="h-96" />;

  const connectLive = async (service) => {
    try {
      const { url } = await apiGet(API_ENDPOINTS.googleStart(service));
      window.location.assign(url);
    } catch (e) {
      flash(e.message);
    }
  };

  const s = me.settings || {};
  const save = (patch, msg = 'Saved.') => settings.mutate(patch, { onSuccess: () => flash(msg) });
  const live = me.modes?.google === 'live';
  const analysisOn = me.analysisEnabled !== false;

  const signOut = () => { logout(); navigate('/login', { replace: true }); };
  const doDelete = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => { logout(); navigate('/login', { replace: true }); },
    });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Your working hours, connections and data." />
      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[999_1_480px] min-w-0 flex flex-col gap-6">
          <Section title="Working hours" note="Focus blocks are placed only inside these hours, around meetings and lunch.">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
              <TimeField label="Start of day" value={s.workStart} onSave={(v) => save({ workStart: v }, 'Working hours saved.')} />
              <TimeField label="End of day" value={s.workEnd} onSave={(v) => save({ workEnd: v }, 'Working hours saved.')} />
              <TimeField label="Lunch starts" value={s.lunchStart} onSave={(v) => save({ lunchStart: v }, 'Lunch saved.')} />
              <TimeField label="Lunch ends" value={s.lunchEnd} onSave={(v) => save({ lunchEnd: v }, 'Lunch saved.')} />
            </div>
            <label className="flex flex-col gap-1.5 text-[13.5px] font-semibold">
              Timezone
              <Field defaultValue={s.timezone || ''} placeholder="Asia/Tokyo"
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.timezone) save({ timezone: v }, 'Timezone saved.'); }} />
            </label>
          </Section>

          <Section title="Appearance" note="Light, dark, or follow your system setting. Saved in this browser.">
            <ThemeSegment className="max-w-[420px]" />
          </Section>

          <Section title="Preferences">
            <div className="flex items-center gap-4">
              <span className="flex-1 font-semibold">Sync focus blocks to Google Calendar</span>
              <Switch id="sync-focus" label="Sync focus blocks to Google Calendar" on={!!s.syncFocusBlocks}
                onChange={(v) => save({ syncFocusBlocks: v }, v ? 'Focus blocks will sync.' : 'Focus blocks stay in DayGraph.')} />
            </div>
            <div className="flex items-center gap-4">
              <span className="flex-1 font-semibold">Meeting analysis</span>
              <Switch id="analysis" label="Meeting analysis" on={analysisOn}
                onChange={(v) => save({ analysisEnabled: v }, v ? 'Analysis resumed.' : 'Analysis paused.')} />
            </div>
          </Section>

          <Section title="Developer tools" note="Issues, pull requests and pages that DayGraph links to your decisions and tasks.">
            <DevTools />
          </Section>

          <Section title="Connections" note="DayGraph reads only what you connect. Disconnecting stops new reads right away.">
            <ul className="flex flex-col">
              {(me.connections || []).map((c) => {
                const bad = c.status === 'error';
                const on = c.status === 'connected';
                const busy = conn.enable.isPending || conn.disable.isPending;
                return (
                  <li key={c.service} className="flex flex-wrap items-center gap-3 py-3 border-t border-divider first:border-t-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${bad ? 'bg-conflict' : on ? 'bg-ok' : 'bg-field-border'}`} />
                    <span className="flex-1 font-semibold">{SERVICE_LABEL[c.service] || c.label}</span>
                    <span className="text-muted text-[13px]">{bad ? 'Needs reconnecting' : on ? 'Connected' : 'Not connected'}</span>
                    {on || bad ? (
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => conn.disable.mutate(c.service)}>Disconnect</Button>
                    ) : (
                      <Button size="sm" disabled={busy} onClick={() => (live ? connectLive(c.service) : conn.enable.mutate(c.service))}>Connect</Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div className="flex-[1_1_300px] max-w-[380px] min-w-0 flex flex-col gap-6">
          <Section title="Account">
            <div>
              <div className="font-semibold text-[17px]">{me.user?.name}</div>
              <div className="text-muted text-[13.5px]">{[me.user?.role, me.user?.city].filter(Boolean).join(', ')}</div>
            </div>
            <div><Chip tone={live ? 'ok' : 'quiet'}>{live ? 'Live' : 'Live'}</Chip></div>
            <Button variant="secondary" className="self-start" onClick={signOut}>Sign out</Button>
          </Section>

          <Section title="Your data" note="Export everything DayGraph holds about you as one JSON file.">
            <Button variant="secondary" className="self-start" disabled={exportData.isPending} onClick={() => exportData.mutate()}>Export my data</Button>
          </Section>

          {!live && (
            <Section title="Demo" note="Mock mode only. Puts every sample decision, task and note back to the starting story, ready to record again.">
              <Button variant="secondary" className="self-start" disabled={resetDemo.isPending} onClick={() => resetDemo.mutate()}>Reset demo data</Button>
            </Section>
          )}

          <Section title="Delete account" note="Removes your notes, ideas, links, tasks and connections from DayGraph. Meetings you attended stay with the other people in them.">
            {confirmDelete ? (
              <div className="flex flex-col gap-3">
                <p className="font-semibold text-conflict-ink">This cannot be undone. Are you sure?</p>
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="danger" disabled={deleteAccount.isPending} onClick={doDelete}>Yes, delete my account</Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" className="self-start text-conflict-ink" onClick={() => setConfirmDelete(true)}>Delete my account</Button>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
