import { Component, type ErrorInfo, type ReactNode } from 'react';
import { href } from '../router';

interface Props {
  /** Remounted (by its key, from outside) on navigation, so a new page gets a fresh try. */
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render-time exception anywhere below it and shows a message instead of leaving
 * React's own blank page. Does not catch errors from event handlers, effects or async code —
 * those already report through their own `catch` blocks.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Damper: a page failed to render', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="state" role="alert">
          <p>This page hit an unexpected error and could not be shown.</p>
          <p className="muted">{this.state.error.message}</p>
          <p>
            <a href={href.pools()}>Back to all pools</a>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
