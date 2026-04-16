import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import WordCloud from 'wordcloud'
import { Hash } from 'lucide-react'
import type { ZenithDateFilter } from './zenithTypes'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { useTheme } from '../../hooks/useTheme'

export interface ProfitRow {
  text: string
  value: number
}

type WcListItem = {
  word: string
  weight: number
  attributes: Record<string, string>
}

const WC_TIER_FALLBACK: Record<string, string> = {
  '--zenith-wc-tier-high': '#5eead4',
  '--zenith-wc-tier-mid': '#7dd3fc',
  '--zenith-wc-tier-low': '#fbbf24',
}

function tierColor(normalizedWeight: number): string {
  const nw = Math.max(0, Math.min(1, normalizedWeight))
  const cssVar =
    nw > 0.66 ? '--zenith-wc-tier-high' : nw > 0.33 ? '--zenith-wc-tier-mid' : '--zenith-wc-tier-low'
  if (typeof document === 'undefined') return WC_TIER_FALLBACK[cssVar]
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  return raw || WC_TIER_FALLBACK[cssVar]
}

function wordFromCloudItem(item: unknown): string {
  if (Array.isArray(item) && typeof item[0] === 'string') return item[0]
  if (item && typeof item === 'object' && 'word' in item) {
    const w = (item as { word: unknown }).word
    return typeof w === 'string' ? w : ''
  }
  return ''
}

export default function CustomerProfitabilityRank({
  rows,
  dateFilter,
  className = '',
}: {
  rows: ProfitRow[]
  /** FY / Q / M for Projects drill — same as classic Dashboard profitability cloud. */
  dateFilter: ZenithDateFilter
  /** e.g. `h-full min-h-[320px] flex-1` so the card matches a stretched grid row (Executive / Finance Zenith). */
  className?: string
}) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [view, setView] = useState<'cloud' | 'top10'>('cloud')
  const wrapRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [hostSize, setHostSize] = useState({ w: 520, h: 280 })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setHostSize({
        w: Math.max(240, Math.floor(r.width)),
        h: Math.max(240, Math.floor(r.height)),
      })
    }
    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clearGlow = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    host.querySelectorAll('.zenith-wc-glow').forEach((n) => n.classList.remove('zenith-wc-glow'))
  }, [])

  const applyGlow = useCallback(
    (item: unknown) => {
      clearGlow()
      const host = hostRef.current
      if (!host || !item || typeof item !== 'object' || Array.isArray(item)) return
      const attrs = (item as { attributes?: Record<string, string> }).attributes
      const idx = attrs?.['data-idx']
      if (idx == null) return
      host.querySelector(`[data-idx="${idx}"]`)?.classList.add('zenith-wc-glow')
    },
    [clearGlow],
  )

  useEffect(() => {
    if (view !== 'cloud') {
      WordCloud.stop()
      const h = hostRef.current
      if (h) h.textContent = ''
      clearGlow()
      return
    }

    const host = hostRef.current
    if (!host) return

    WordCloud.stop()
    clearGlow()

    if (!rows.length) {
      host.textContent = ''
      return
    }

    const values = rows.map((d) => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const valueRange = maxValue - minValue || 1

    const baseMax = hostSize.w < 400 ? 36 : hostSize.w < 640 ? 42 : 48
    const baseMin = hostSize.w < 400 ? 10 : 12
    const maxByHeight = Math.max(26, Math.floor(hostSize.h / 5.75))
    const maxFont = Math.min(baseMax, maxByHeight)
    const minFont = Math.max(10, Math.round(baseMin * (maxFont / Math.max(baseMax, 1))))

    const list: WcListItem[] = rows.map((item, i) => {
      const normalized = (item.value - minValue) / valueRange
      const fontSize = minFont + normalized * (maxFont - minFont)
      return {
        word: item.text,
        weight: fontSize,
        attributes: { 'data-idx': String(i) },
      }
    })

    host.style.width = `${hostSize.w}px`
    host.style.height = `${hostSize.h}px`

    try {
      WordCloud(host, {
        list,
        gridSize: Math.round(
          Math.max(8, Math.min(14, hostSize.w / 48, hostSize.h / 28)),
        ),
        weightFactor: 1,
        fontFamily: 'Plus Jakarta Sans, DM Sans, system-ui, sans-serif',
        fontWeight: '600',
        color: (_word: string, weight: number) => {
          const nw = (weight - minFont) / (maxFont - minFont || 1)
          return tierColor(Math.max(0, Math.min(1, nw)))
        },
        rotateRatio: 0,
        rotationSteps: 0,
        backgroundColor: 'transparent',
        drawOutOfBound: false,
        shuffle: false,
        shape: 'circle',
        ellipticity: 0.65,
        classes: () => 'zenith-wc-word',
        hover: (item: unknown, _dimension: unknown, _evt: Event) => {
          if (!item) clearGlow()
          else applyGlow(item)
        },
        click: (item: unknown) => {
          const w = wordFromCloudItem(item).trim()
          if (!w) return
          navigate(buildProjectsUrl({ search: w, zenithSlice: 'revenue' }, dateFilter))
        },
      })
    } catch (e) {
      if (import.meta.env.DEV) console.error('Zenith word cloud:', e)
    }

    return () => {
      WordCloud.stop()
      clearGlow()
    }
  }, [rows, hostSize.w, hostSize.h, view, clearGlow, applyGlow, dateFilter, navigate, theme])

  const top10 = [...rows].sort((a, b) => b.value - a.value).slice(0, 10)
  const maxVal = Math.max(...rows.map((d) => d.value), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4 min-h-[320px] lg:h-full lg:min-h-0 flex flex-col overflow-visible lg:overflow-hidden ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--accent-purple-muted)]">
            <Hash className="w-5 h-5 text-[color:var(--accent-purple)]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="zenith-display text-base sm:text-lg font-bold text-[color:var(--text-primary)] truncate">
              Customer Projects Profitability
            </h3>
            <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5">Same data as the classic dashboard</p>
          </div>
        </div>
        <div
          className="flex rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-0.5 flex-shrink-0"
          role="tablist"
          aria-label="Profitability view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'cloud'}
            onClick={() => setView('cloud')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === 'cloud'
                ? 'bg-[color:var(--accent-teal-muted)] text-[color:var(--text-primary)] border border-[color:var(--accent-teal-border)] shadow-[0_0_16px_color-mix(in_srgb,var(--accent-teal)_18%,transparent)]'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]'
            }`}
          >
            Word Cloud
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'top10'}
            onClick={() => setView('top10')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === 'top10'
                ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)] border border-[color:var(--accent-gold-border)] shadow-[0_0_16px_color-mix(in_srgb,var(--accent-gold)_14%,transparent)]'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]'
            }`}
          >
            Top 10
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[280px] lg:min-h-0">
        <div
          className={`absolute inset-0 flex flex-col min-h-0 ${view === 'cloud' ? 'z-[1]' : 'z-0 opacity-0 pointer-events-none'}`}
          aria-hidden={view !== 'cloud'}
        >
          {rows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]">
              <p className="text-sm text-[color:var(--text-muted)] text-center px-4">No profitability data for this filter.</p>
            </div>
          ) : (
            <>
              <div
                ref={wrapRef}
                className="zenith-wordcloud-host flex-1 min-h-[280px] w-full rounded-xl border border-[color:var(--border-default)] overflow-visible lg:overflow-hidden cursor-pointer"
              >
                <div ref={hostRef} className="relative h-full min-h-[280px] w-full" />
              </div>
              <p className="mt-2 text-center text-[11px] text-[color:var(--text-muted)]">
                Font size represents profitability (larger = higher margin).
              </p>
              <p className="mt-0.5 text-center text-[11px] text-[color:var(--accent-gold)] font-medium">
                Click a word to open Projects →
              </p>
            </>
          )}
        </div>

        <div
          className={`absolute inset-0 flex flex-col min-h-0 overflow-hidden ${view === 'top10' ? 'z-[1]' : 'z-0 opacity-0 pointer-events-none'}`}
          aria-hidden={view !== 'top10'}
        >
          {rows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]">
              <p className="text-sm text-[color:var(--text-muted)] text-center px-4">No profitability data for this filter.</p>
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 border-b border-[color:var(--border-default)] bg-[color:var(--bg-card)] backdrop-blur-sm">
                  <tr>
                    <th className="w-12 px-2 py-2.5 text-center text-sm font-bold uppercase tracking-wide text-[color:var(--accent-gold)]">
                      #
                    </th>
                    <th className="px-2 py-2.5 text-left text-sm font-bold uppercase tracking-wide text-[color:var(--accent-gold)]">
                      Project
                    </th>
                    <th className="w-[4.5rem] px-2 py-2.5 text-right text-sm font-bold uppercase tracking-wide text-[color:var(--accent-gold)]">
                      Margin
                    </th>
                    <th className="py-2.5 pl-1 pr-2 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-default)]">
                  {top10.map((row, idx) => {
                    const pct = (row.value ?? 0) / maxVal
                    return (
                      <tr
                        key={`${row.text}-${idx}`}
                        className="hover:bg-[color:var(--bg-table-hover)] transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const t = row.text?.trim()
                          if (!t) return
                          navigate(buildProjectsUrl({ search: t, zenithSlice: 'revenue' }, dateFilter))
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return
                          e.preventDefault()
                          const t = row.text?.trim()
                          if (!t) return
                          navigate(buildProjectsUrl({ search: t, zenithSlice: 'revenue' }, dateFilter))
                        }}
                      >
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1 rounded-lg text-xs font-bold tabular-nums ${
                              idx === 0
                                ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                                : idx === 1
                                  ? 'bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)]'
                                  : idx === 2
                                    ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                                    : 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2 font-medium text-[color:var(--text-primary)] truncate max-w-[140px] sm:max-w-[220px]"
                          title={row.text}
                        >
                          {row.text}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-[color:var(--accent-teal)] tabular-nums text-xs">
                          {typeof row.value === 'number' ? row.value.toFixed(1) : '—'}%
                        </td>
                        <td className="py-2 pl-1 pr-2 align-middle">
                          <div className="h-2 rounded-full bg-[color:var(--bg-ticker)] overflow-hidden min-w-[3.5rem]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent-purple)] via-[color:var(--accent-teal)] to-[color:var(--accent-gold)] transition-all duration-300"
                              style={{ width: `${Math.round(pct * 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
