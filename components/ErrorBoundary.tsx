import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // FIX: Class properties like `state` must be initialized on `this` in the constructor.
    // FIX: Correctly initialize state on `this`.
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    // FIX: Class methods like `setState` must be called on `this`.
    // FIX: Correctly call `setState` on `this`.
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    // FIX: Class properties like `state` must be accessed with `this`.
    // FIX: Correctly access `state` with `this`.
    if (this.state.hasError) {
      // FIX: Class properties like `props` must be accessed with `this`.
      // FIX: Correctly access `props` with `this`.
      if (this.props.fallback) {
        // FIX: Class properties like `props` must be accessed with `this`.
        // FIX: Correctly return `fallback` from `this.props`.
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'white', border: '1px dashed var(--border-primary)', borderRadius: '1rem', margin: '1rem' }}>
            <h1 className="themed-title">משהו השתבש.</h1>
            <p>אפשר לנסות לרענן את הדף או את הרכיב.</p>
             <button
                // FIX: Correctly call class method `handleRetry` on `this`.
                onClick={this.handleRetry}
                style={{
                    marginTop: '1.5rem',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                }}
            >
                נסה שוב
            </button>
        </div>
      );
    }

    // FIX: Class properties like `props` must be accessed with `this`.
    // FIX: Correctly return `children` from `this.props`.
    return this.props.children;
  }
}

export default ErrorBoundary;