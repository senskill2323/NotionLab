import React from 'react';

const ErrorScreen = ({ title, message, details }) => (
  <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-6">
    <div className="max-w-xl w-full border border-border/60 rounded-lg bg-card/80 p-6 shadow-sm">
      <h1 className="text-lg font-semibold mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {details ? (
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground/90 bg-muted/30 p-3 rounded">
          {String(details)}
        </pre>
      ) : null}
    </div>
  </div>
);

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta?.env?.DEV);
      return (
        <ErrorScreen
          title="Une erreur est survenue"
          message="L'application a rencontré une erreur. Réessayez plus tard ou contactez le support."
          details={isDev ? this.state.error?.message : null}
        />
      );
    }
    return this.props.children;
  }
}

export default GlobalErrorBoundary;

