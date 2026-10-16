/**
 * Lightweight product events for Zenith Ask adoption.
 * Logs to console and optional `window.__rayennaTrack` hook (no third-party SDK required).
 */

export type ZenithAskAnalyticsEvent =
  | 'ask_submitted'
  | 'ask_success'
  | 'ask_action'
  | 'ask_clarify'
  | 'ask_error'
  | 'ask_open_projects'
  | 'ask_chip_click'

export type ZenithAskAnalyticsProps = {
  role?: string
  metric?: string
  chipMatch?: boolean
  clarify?: boolean
  relativeDate?: string | null
  source?: 'typed' | 'chip' | 'follow_up' | 'history' | 'dictate'
  ms?: number
  [key: string]: unknown
}

declare global {
  interface Window {
    __rayennaTrack?: (event: string, props?: Record<string, unknown>) => void
  }
}

export function trackZenithAskEvent(
  event: ZenithAskAnalyticsEvent,
  props: ZenithAskAnalyticsProps = {},
): void {
  const payload = { ...props, at: Date.now() }
  try {
    console.info('[zenith-ask]', event, payload)
  } catch {
    /* ignore */
  }
  try {
    if (typeof window !== 'undefined' && typeof window.__rayennaTrack === 'function') {
      window.__rayennaTrack(event, payload)
    }
  } catch {
    /* ignore */
  }
}
