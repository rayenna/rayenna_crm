import { useThemeContext } from './useTheme'

export type ChartColorSet = {
  gold: string
  goldSoft: string
  teal: string
  tealSoft: string
  red: string
  purple: string
  blue: string
  green: string
  grid: string
  axisText: string
  tooltipBg: string
  tooltipBorder: string
  /** Primary label/value text inside custom tooltip divs */
  tooltipFg: string
  tooltipFgMuted: string
  tooltipShadow: string
  /** Tooltip / selection band on chart plot */
  cursorBand: string
}

const TOKEN_COLORS: ChartColorSet = {
  gold: 'var(--accent-gold)',
  goldSoft: 'var(--accent-gold-muted)',
  teal: 'var(--accent-teal)',
  tealSoft: 'var(--accent-teal-muted)',
  red: 'var(--accent-red)',
  purple: 'var(--accent-purple)',
  blue: 'var(--accent-blue)',
  green: 'var(--accent-green)',
  grid: 'var(--chart-grid)',
  axisText: 'var(--chart-axis-text)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  tooltipFg: 'var(--chart-tooltip-fg)',
  tooltipFgMuted: 'var(--chart-tooltip-fg-muted)',
  tooltipShadow: 'var(--chart-tooltip-shadow)',
  cursorBand: 'var(--chart-cursor-band)',
}

export function useChartColors(): ChartColorSet {
  // Theme-specific values are resolved via CSS variables (tokens.css).
  useThemeContext()
  return TOKEN_COLORS
}
