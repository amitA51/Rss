import React, { ErrorInfo, ReactNode, StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary Component to catch runtime errors in the component tree
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Reverted to using a class property for state initialization.
  // The constructor-based initialization was causing issues in the build environment,
  // suggesting a problem with `this` context. This syntax is more modern and directly
  // attaches state to the component instance.
  state: ErrorBoundaryState = { hasError: false };

  // FIX: Added constructor to ensure `this.props` is correctly initialized,
  // which can resolve typing issues in some build environments.
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
            <h1>משהו השתבש.</h1>
            <p>אפשר לנסות לרענן את הדף. אם הבעיה נמשכת, אפשר לאפס את נתוני האפליקציה.</p>
             <button
                onClick={() => window.location.reload()}
                style={{
                    marginTop: '1.5rem',
                    padding: '0.75rem 1.5rem',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                }}
            >
                רענן עמוד
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}


const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );

  // --- PWA Service Worker Registration ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        // Store the registration for later use (e.g., periodic sync)
        window.swRegistration = registration;
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });

    // --- PWA Update Logic ---
    // This listens for the 'controllerchange' event, which fires when the service
    // worker controlling the page changes, indicating a successful update.
    let refreshing: boolean;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
  }
}
