/**
 * Sentry error and performance monitoring for Proposal Engine frontend.
 * Only initializes when VITE_SENTRY_DSN is set (e.g. in production on Render).
 */
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry(): void {
  if (!DSN || typeof DSN !== 'string' || DSN.trim() === '') {
    return;
  }
  Sentry.init({
    dsn: DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
    environment: import.meta.env.MODE,
    release: 'proposal-engine@1.0.0',
  });
  Sentry.setTag('module', 'proposal-engine');
}

/**
 * Call this from the console or a temporary dev button to verify Sentry is receiving events.
 * Triggers an unhandled exception that Sentry should capture.
 */
export function triggerSentryTestError(): void {
  throw new Error('Proposal Engine Sentry test error (intentional)');
}
