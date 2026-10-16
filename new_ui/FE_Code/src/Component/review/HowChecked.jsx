import { CheckMark } from '../ui/Check';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import { useMe, useUpdateSettings } from '../../api/hooks';
import { useUi } from '../../context/contexts';

export default function HowChecked({ checks = [] }) {
  const { data: me } = useMe();
  const settings = useUpdateSettings();
  const { flash } = useUi();
  const enabled = me?.analysisEnabled !== false;
  return (
    <aside className="flex-[1_1_300px] max-w-[380px] min-w-0 flex flex-col gap-5">
      <Panel className="p-6">
        <h2 className="text-[15.5px] font-semibold">How DayGraph checked this</h2>
        <ul className="mt-4 flex flex-col gap-4">
          {checks.map((t) => (
            <li key={t} className="flex gap-3 items-start"><CheckMark size={22} iconSize={12} /><span>{t}</span></li>
          ))}
        </ul>
        <div className="mt-5 pt-4 font-semibold border-t border-divider">Nothing is created until you accept.</div>
      </Panel>
      <Panel className="p-6">
        <h2 className="text-[15.5px] font-semibold">Not for this meeting?</h2>
        <p className="text-muted mt-1.5 leading-normal">Tell DayGraph to skip a meeting before it starts, or pause analysis for everything.</p>
        <Button variant="secondary" size="sm" className="mt-3.5"
          onClick={() => { settings.mutate({ analysisEnabled: !enabled }); flash(enabled ? 'Analysis paused.' : 'Analysis resumed.'); }}>
          {enabled ? 'Pause analysis' : 'Resume analysis'}
        </Button>
      </Panel>
    </aside>
  );
}
