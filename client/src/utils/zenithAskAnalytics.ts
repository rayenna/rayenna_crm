/**
 * Zenith Ask product analytics.
 * - console + optional window.__rayennaTrack
 * - fire-and-forget POST to /api/dashboard/zenith-ask-event for client-only events
 *   (server logs submit/success/clarify/error from /zenith-nl-query)
 */

import axiosInstance from './axios'

export type ZenithAskAnalyticsEvent =
  | 'ask_submitted'
  | 'ask_success'
  | 'ask_action'
  | 'ask_clarify'
  | 'ask_error'
  | 'ask_open_projects'
  | 'ask_chip_click'
  | 'ask_catalog_pick'

export type ZenithAskAnalyticsProps = {
  role?: string
  metric?: string
  chipMatch?: boolean
  clarify?: boolean
  relativeDate?: string | null
  source?: 'typed' | 'chip' | 'follow_up' | 'history' | 'dictate' | 'palette' | 'catalog'
  ms?: number
  href?: string
  [key: string]: unknown
}

/** Events the API accepts from the browser (server already logs query outcomes). */
const CLIENT_SINK_EVENTS = new Set<ZenithAskAnalyticsEvent>([
  'ask_chip_click',
  'ask_open_projects',
  'ask_catalog_pick',
])

declare global {
  interface Window {
    __rayennaTrack?: (event: string, props?: Record<string, unknown>) => void
  }
}

function postClientSink(event: ZenithAskAnalyticsEvent, props: ZenithAskAnalyticsProps): void {
  if (!CLIENT_SINK_EVENTS.has(event)) return
  void axiosInstance
    .post('/api/dashboard/zenith-ask-event', { event, props }, { timeout: 4000 })
    .catch(() => {
      /* ignore — analytics must not break Ask */
    })
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
  try {
    postClientSink(event, props)
  } catch {
    /* ignore */
  }
}
