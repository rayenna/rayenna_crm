import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { scrubSentryEvent } from './utils/sentryScrub'
import './styles/tokens.css'
import './index.css'

registerSW({
  onNeedRefresh() {
    console.log('New version available — updating...')
  },
  onOfflineReady() {
    console.log('Zenith is ready to work offline')
  },
  onRegistered(swRegistration) {
    console.log('Service Worker registered', swRegistration)
  },
  onRegisterError(error) {
    console.error('SW registration failed:', error)
  },
})

// Sentry (optional – only when VITE_SENTRY_DSN is set)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    beforeSend(event) {
      scrubSentryEvent(event as unknown as Record<string, unknown>)
      return event
    },
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 403) return false
        return failureCount < 1
      },
    },
  },
})

// User-friendly messages for known technical errors (avoid exposing implementation details)
function getFriendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  if (message.includes('useAuth must be used within AuthProvider')) {
    return 'The app didn’t load correctly. Please refresh the page. If the problem continues, try logging in again or contact your administrator.'
  }
  if (message.includes('AuthProvider') || message.includes('context')) {
    return 'Something went wrong loading this page. Please refresh and try again.'
  }
  return message
}

const isDev = import.meta.env.DEV

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => {
        const friendlyMessage = getFriendlyErrorMessage(error)
        const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error')
        const showTechnical = isDev && rawMessage !== friendlyMessage
        return (
          <div style={{ padding: 24, textAlign: 'center', fontFamily: 'sans-serif', maxWidth: 480, margin: '40px auto' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: '#374151', lineHeight: 1.5, marginBottom: 16 }}>
              {friendlyMessage}
            </p>
            {showTechnical && (
              <pre style={{ textAlign: 'left', overflow: 'auto', maxWidth: '100%', fontSize: 12, color: '#6b7280', marginBottom: 16, padding: 12, background: '#f3f4f6', borderRadius: 8 }}>
                {rawMessage}
              </pre>
            )}
            <button
              type="button"
              onClick={resetError}
              style={{ marginTop: 8, padding: '10px 20px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
            >
              Try again
            </button>
          </div>
        )
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
