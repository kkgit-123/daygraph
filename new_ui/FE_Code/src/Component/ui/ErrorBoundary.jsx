import { Component } from 'react';
import Button from './Button';
import Panel from './Panel';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('DayGraph page crashed', error, info?.componentStack);
  }

  retry() {
    this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen w-full bg-ground flex items-center justify-center p-4">
        <Panel role="alert" className="w-full max-w-[460px] p-9 flex flex-col gap-4">
          <h1 className="text-[22px] font-semibold">Something went wrong on this page</h1>
          <p className="text-muted leading-normal">Nothing was lost. Your changes are saved in DayGraph. Try again, or reload the page if it keeps happening.</p>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={this.retry}>Retry</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </Panel>
      </div>
    );
  }
}
