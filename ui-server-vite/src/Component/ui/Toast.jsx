import { useUi } from '../../context/contexts';
import Icon from './Icon';

export default function Toast() {
  const { toast } = useUi();
  if (!toast) return null;
  return (
    <div role="status"
      className="fixed left-1/2 bottom-7 -translate-x-1/2 z-20 flex items-center gap-2.5 px-5 py-[13px] rounded-xl bg-rail text-white font-semibold shadow-[0_8px_24px_rgba(27,33,80,.28)] max-w-[calc(100vw-32px)]">
      <Icon name="check" size={18} sw={2.6} color="#7FE0B8" />
      <span>{toast}</span>
    </div>
  );
}
