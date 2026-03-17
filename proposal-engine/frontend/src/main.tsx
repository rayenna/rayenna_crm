import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initSentry, triggerSentryTestError } from './monitoring/sentry';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

void initSentry();

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __triggerSentryTestError?: () => void }).__triggerSentryTestError = triggerSentryTestError;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
