import type { CSSProperties } from 'react'

/**
 * Shared Recharts <Tooltip /> styling for Zenith dashboard charts.
 * Default cursor is a harsh light grey band on dark backgrounds; use the orange tint
 * from lifecycle panel/inverter brand charts instead.
 */
export const ZENITH_RECHARTS_TOOLTIP_CURSOR = { fill: 'var(--accent-gold-muted)' } as const

export const ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE = { outline: 'none', zIndex: 100 } as const

/** Custom `content` render tooltips (portaled under body — must use CSS vars, not hardcoded dark). */
export const ZENITH_CHART_CUSTOM_TOOLTIP_SHELL: CSSProperties = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontFamily: 'DM Sans, sans-serif',
  boxShadow: 'var(--chart-tooltip-shadow)',
}

/** Analytics card shell — use instead of zenith-glass + white/[0.03] (theme-safe in light + dark). */
export const ZENITH_DASHBOARD_ANALYTICS_CARD =
  'flex min-h-[360px] flex-col rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5'

/** Portaled Recharts custom tooltip — matches `--chart-tooltip-*` tokens per theme. */
export const ZENITH_CHART_TOOLTIP_PANEL =
  'rounded-xl border border-[color:var(--chart-tooltip-border)] bg-[color:var(--chart-tooltip-bg)] p-3 text-left shadow-[var(--chart-tooltip-shadow)] sm:p-4'

export const ZENITH_CHART_TOOLTIP_TITLE = 'mb-2 font-extrabold text-[color:var(--chart-tooltip-fg)]'
export const ZENITH_CHART_TOOLTIP_LINE = 'text-sm text-[color:var(--chart-tooltip-fg-muted)]'
export const ZENITH_CHART_TOOLTIP_INSIGHT = 'mt-1 text-xs font-semibold text-[color:var(--accent-teal)]'
