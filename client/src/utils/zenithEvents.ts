/** Dispatched when Zenith overlays (e.g. quick action drawer) open — close floating UI (Deal Health card, etc.). */
export const ZENITH_FLOATING_DISMISS_EVENT = 'zenith-floating-dismiss'

/** After a Zenith quick drawer closes, remount one chart group (see `ZenithChartTouchReset`). */
export const ZENITH_CHARTS_TOUCH_RESET_EVENT = 'zenith-charts-touch-reset'

export type ZenithChartsTouchResetDetail = { chartGroup: string }

export function dispatchZenithChartsTouchReset(chartGroup: string) {
  if (typeof window === 'undefined') return
  const detail: ZenithChartsTouchResetDetail = { chartGroup }
  window.dispatchEvent(new CustomEvent(ZENITH_CHARTS_TOUCH_RESET_EVENT, { detail }))
}
