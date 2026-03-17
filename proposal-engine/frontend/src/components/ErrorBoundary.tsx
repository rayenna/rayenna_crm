import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      const DSN = import.meta.env.VITE_SENTRY_DSN;
      if (DSN && typeof DSN === 'string' && DSN.trim() !== '') {
        void import('@sentry/react').then((Sentry) => {
          Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
        });
      }
    } catch {
      // ignore sentry failures
    }
    if (import.meta.env.DEV) {
      console.error('Proposal Engine error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-lg text-center">
            <p className="text-6xl mb-4">⚠️</p>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-600 mb-4">
              The app hit an error. Try refreshing the page. If it keeps happening, clear this site’s data for this app and log in again.
            </p>
            <p className="text-xs text-slate-500 font-mono mb-6 truncate" title={this.state.error.message}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
