import { Link } from 'react-router-dom';
import Button from '../Component/ui/Button';
import Panel from '../Component/ui/Panel';

export default function NotFound() {
  return (
    <Panel className="p-9 max-w-[560px] flex flex-col gap-4">
      <div className="text-muted font-semibold">404</div>
      <h1 className="text-[26px] font-semibold tracking-[-0.015em]">That page is not here</h1>
      <p className="text-muted leading-normal">The link may be old, or the page was moved. Your decisions and tasks are still in Today and Review.</p>
      <Link to="/" className="self-start"><Button>Back to Today</Button></Link>
    </Panel>
  );
}
