/**
 * ErrorBoundary — catches render-phase crashes so a thrown error shows a
 * readable card (+ Reload) instead of unmounting the whole app to a BLANK
 * WHITE SCREEN. Also surfaces the error + component stack (the diagnostic we
 * were missing) and best-effort logs it to the server.
 *
 * React error boundaries must be class components (no hook equivalent for
 * getDerivedStateFromError / componentDidCatch).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label so we know which boundary fired (e.g. "dashboard"). */
  scope?: string;
}
interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    // Always log to the console for local debugging.
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ''}]`, error, info.componentStack);
    // Best-effort server log (fire-and-forget; ignore if the route is absent).
    try {
      void fetch('/api/v1/public/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: this.props.scope ?? null,
          message: error.message,
          stack: (error.stack ?? '').slice(0, 4000),
          componentStack: (info.componentStack ?? '').slice(0, 4000),
          url: typeof location !== 'undefined' ? location.href : null,
        }),
      }).catch(() => undefined);
    } catch {
      /* never let logging throw */
    }
  }

  private reset = () => this.setState({ error: null, info: null });

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: '#13241a',
            border: '1px solid #21372b',
            borderRadius: 16,
            padding: '24px 26px',
            color: '#eaf6ee',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Something went wrong</div>
          <p style={{ fontSize: 14, color: '#9fb8a8', margin: '0 0 16px', lineHeight: 1.6 }}>
            This screen hit an error and couldn't render. Your data is safe — reload to continue.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button
              onClick={() => location.reload()}
              style={{ background: '#b6ff3c', color: '#0d1518', border: 'none', borderRadius: 999, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Reload
            </button>
            <button
              onClick={this.reset}
              style={{ background: 'transparent', color: '#9fb8a8', border: '1px solid #2c4435', borderRadius: 999, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
          <details style={{ fontSize: 12, color: '#7f9b8a' }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8, color: '#cdebb0' }}>
              {error.message}
              {info?.componentStack ? `\n${info.componentStack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
