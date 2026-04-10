import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import WordCloud from 'wordcloud'
import { Hash } from 'lucide-react'
import type { ZenithDateFilter } from './zenithTypes'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'

export interface ProfitRow {
  text: string
  value: number
}

type WcListItem = {
  word: string
  weight: number
  attributes: Record<string, string>
}

function tierColor(normalizedWeight: number): string {
  if (normalizedWeight > 0.66) return '#5eead4'
  if (normalizedWeight > 0.33) return '#7dd3fc'
  return '#fbbf24'
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
  }, [rows, hostSize.w, hostSize.h, view, clearGlow, applyGlow, dateFilter, navigate])

  const top10 = [...rows].sort((a, b) => b.value - a.value).slice(0, 10)
  const maxVal = Math.max(...rows.map((d) => d.value), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`zenith-glass rounded-xl p-3 sm:p-4 min-h-[320px] lg:h-full lg:min-h-0 flex flex-col overflow-visible lg:overflow-hidden ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/35 to-indigo-600/40 border border-white/10">
            <Hash className="w-5 h-5 text-violet-200" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="zenith-display text-base sm:text-lg font-bold text-white truncate">
              Customer Projects Profitability
            </h3>
            <p className="text-[11px] text-white/40 mt-0.5">Same data as the classic dashboard</p>
          </div>
        </div>
        <div
          className="flex rounded-xl border border-white/[0.12] bg-black/25 p-0.5 flex-shrink-0"
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
                ? 'bg-white/[0.12] text-white shadow-[0_0_20px_rgba(0,212,180,0.12)] border border-[#00d4b4]/30'
                : 'text-white/45 hover:text-white/75'
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
                ? 'bg-white/[0.12] text-white shadow-[0_0_20px_rgba(245,166,35,0.1)] border border-[#f5a623]/25'
                : 'text-white/45 hover:text-white/75'
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
            <div className="flex flex-1 items-center justify-center rounded-xl border border-white/[0.06] bg-black/20">
              <p className="text-sm text-white/45 text-center px-4">No profitability data for this filter.</p>
            </div>
          ) : (
            <>
              <div
                ref={wrapRef}
                className="zenith-wordcloud-host flex-1 min-h-[280px] w-full rounded-xl border border-white/[0.06] bg-black/20 overflow-visible lg:overflow-hidden cursor-pointer"
              >
                <div ref={hostRef} className="relative h-full min-h-[280px] w-full" />
              </div>
              <p className="mt-2 text-center text-[11px] text-white/35">
                Font size represents profitability (larger = higher margin).
              </p>
              <p className="mt-0.5 text-center text-[11px] text-[#f5a623]/90 font-medium">
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
            <div className="flex flex-1 items-center justify-center rounded-xl border border-white/[0.06] bg-black/20">
              <p className="text-sm text-white/45 text-center px-4">No profitability data for this filter.</p>
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-white/[0.08] bg-black/15"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 border-b border-white/[0.1] bg-[#12121a]/95 backdrop-blur-md">
                  <tr>
                    <th className="text-center py-2.5 px-2 w-12 font-bold text-white/70 text-[10px] uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left py-2.5 px-2 font-bold text-white/70 text-[10px] uppercase tracking-wider">
                      Project
                    </th>
                    <th className="text-right py-2.5 px-2 w-[4.5rem] font-bold text-white/70 text-[10px] uppercase tracking-wider">
                      Margin
                    </th>
                    <th className="py-2.5 pl-1 pr-2 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {top10.map((row, idx) => {
                    const pct = (row.value ?? 0) / maxVal
                    return (
                      <tr
                        key={`${row.text}-${idx}`}
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer"
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
                                ? 'bg-[#f5a623]/25 text-[#f5d78a]'
                                : idx === 1
                                  ? 'bg-white/10 text-white/80'
                                  : idx === 2
                                    ? 'bg-[#f5a623]/15 text-[#f5c76a]'
                                    : 'bg-[#00d4b4]/12 text-[#7ee8d8]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium text-white/90 truncate max-w-[140px] sm:max-w-[220px]" title={row.text}>
                          {row.text}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-[#00d4b4] tabular-nums text-xs">
                          {typeof row.value === 'number' ? row.value.toFixed(1) : '—'}%
                        </td>
                        <td className="py-2 pl-1 pr-2 align-middle">
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden min-w-[3.5rem]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-[#00d4b4] to-[#f5a623] transition-all duration-300"
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
