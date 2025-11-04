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
  // FIX: Reverted to a constructor for state initialization. This can resolve issues with `this.props` not being available in certain build configurations.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
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
            <p>נסה לרענן את הדף. אם הבעיה נמשכת, נסה לאפס את נתוני האפליקציה.</p>
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
        (window as any).swRegistration = registration;
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