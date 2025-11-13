import React, { ErrorInfo, ReactNode, StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      {/* FIX: The ErrorBoundary component requires a `children` prop. This is fixed by wrapping the <App /> component within the <ErrorBoundary> tags instead of using a self-closing tag. */}
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