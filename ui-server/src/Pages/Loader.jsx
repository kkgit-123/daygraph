import { LogoMark } from '../Component/ui/Logo';

const Loader = () => (
  <div className="flex h-screen w-full flex-col gap-4 justify-center items-center bg-ground" role="status" aria-label="Loading">
    <div className="relative">
      <span aria-hidden="true" className="absolute -inset-3 rounded-[20px] border-2 border-accent/30 border-t-accent animate-spin" />
      <LogoMark size={44} />
    </div>
    <span className="text-muted text-[13px] breathe">Loading your day…</span>
  </div>
);

export default Loader;
