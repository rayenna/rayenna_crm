import { useEffect, useRef, useState, memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import WordCloud from 'wordcloud'
import type { ZenithDateFilter } from '../zenith/zenithTypes'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { ZENITH_DASHBOARD_ANALYTICS_CARD } from './zenithRechartsTooltipStyles'

interface WordCloudData {
  text: string
  value: number
}

interface ProfitabilityWordCloudProps {
  availableFYs?: string[]
  /** When provided with filterControlledByParent, use this data instead of fetching */
  wordCloudData?: WordCloudData[]
  /** When true, filter is the dashboard FY/Qtr/Month; use wordCloudData prop, no chart filter UI */
  filterControlledByParent?: boolean
  /** Dashboard FY / Q / M for Projects drill when controlled by parent */
  dashboardFilter?: ZenithDateFilter | null
}

// Months ordered from April to March (Financial Year order)
const MONTHS = [
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
]

const ProfitabilityWordCloud = memo(
  ({
    availableFYs = [],
    wordCloudData: wordCloudDataProp,
    filterControlledByParent,
    dashboardFilter,
  }: ProfitabilityWordCloudProps) => {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [view, setView] = useState<'cloud' | 'top10'>('cloud')
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fyDropdownRef.current && !fyDropdownRef.current.contains(event.target as Node)) {
        setShowFYDropdown(false)
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['wordcloud', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/wordcloud?${params.toString()}`)
      return res.data
    },
    enabled: !filterControlledByParent,
  })

  const cloudData = filterControlledByParent && wordCloudDataProp ? wordCloudDataProp : data?.wordCloudData
  const showLoading = !filterControlledByParent && isLoading

  const drillDateFilter: ZenithDateFilter = useMemo(() => {
    if (filterControlledByParent) {
      return {
        selectedFYs: dashboardFilter?.selectedFYs ?? [],
        selectedQuarters: dashboardFilter?.selectedQuarters ?? [],
        selectedMonths: dashboardFilter?.selectedMonths ?? [],
      }
    }
    return {
      selectedFYs,
      selectedQuarters: [],
      selectedMonths,
    }
  }, [filterControlledByParent, dashboardFilter, selectedFYs, selectedMonths])

  const lastBucketRef = useRef<string | null>(null)

  useEffect(() => {
    const getBucket = (width: number) => {
      if (width < 640) return 'sm'
      if (width < 1024) return 'md'
      return 'lg'
    }
    const updateDimensions = () => {
      const width = window.innerWidth
      const bucket = getBucket(width)
      if (lastBucketRef.current === bucket) return
      lastBucketRef.current = bucket

      const container = canvasRef.current?.parentElement
      if (container) {
        const padding = width < 640 ? 32 : 48
        const maxWidth = container.clientWidth - padding
        const w = Math.min(maxWidth, 600)
        const h = width < 640
          ? Math.min(300, w * 0.75)
          : width < 1024
          ? Math.min(350, w * 0.7)
          : Math.min(400, w * 0.67)
        setDimensions({ width: w, height: h })
      } else {
        const fallbackWidth = width < 640 ? 280 : width < 1024 ? 400 : 500
        const fallbackHeight = width < 640 ? 300 : width < 1024 ? 350 : 400
        setDimensions({ width: fallbackWidth, height: fallbackHeight })
      }
    }

    const initBucket = getBucket(window.innerWidth)
    lastBucketRef.current = initBucket
    const container = canvasRef.current?.parentElement
    if (container) {
      const padding = window.innerWidth < 640 ? 32 : 48
      const maxWidth = container.clientWidth - padding
      const w = Math.min(maxWidth, 600)
      const h = window.innerWidth < 640 ? Math.min(300, w * 0.75) : window.innerWidth < 1024 ? Math.min(350, w * 0.7) : Math.min(400, w * 0.67)
      setDimensions({ width: w, height: h })
    } else {
      const w = window.innerWidth < 640 ? 280 : window.innerWidth < 1024 ? 400 : 500
      const h = window.innerWidth < 640 ? 300 : window.innerWidth < 1024 ? 350 : 400
      setDimensions({ width: w, height: h })
    }

    // Chrome on Windows fires resize more often; longer debounce reduces flicker/hang
    const isChrome = typeof navigator !== 'undefined' && /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent)
    const DEBOUNCE_MS = isChrome ? 1500 : 600
    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        resizeTimeoutRef.current = null
        updateDimensions()
      }, DEBOUNCE_MS)
    }
    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !cloudData || cloudData.length === 0) {
      // Clear canvas if no data
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
      return
    }

    const canvas = canvasRef.current
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Normalize values for font size (min 10px, max based on screen size)
    const maxFontSize = window.innerWidth < 640 ? 40 : window.innerWidth < 1024 ? 50 : 60
    const minFontSize = window.innerWidth < 640 ? 12 : 16
    const values = cloudData.map((d: WordCloudData) => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const valueRange = maxValue - minValue || 1

    // Prepare data for wordcloud library (use cloudData, which may come from parent when filterControlledByParent)
    const wordCloudList: [string, number][] = cloudData.map((item: WordCloudData) => {
      // Scale profitability value to font size
      const normalizedValue = (item.value - minValue) / valueRange
      const fontSize = minFontSize + normalizedValue * (maxFontSize - minFontSize)
      return [item.text, fontSize]
    })

    // Clear canvas
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Generate word cloud
    try {
      WordCloud(canvas, {
        list: wordCloudList,
        gridSize: Math.round(dimensions.width / 50),
        weightFactor: 1,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: (_word: string, weight: number) => {
          // Color based on weight (profitability) - gradient from red to blue to green
          const normalizedWeight = (weight - minFontSize) / (maxFontSize - minFontSize)
          if (normalizedWeight > 0.7) {
            return '#10b981' // Green for high profitability
          } else if (normalizedWeight > 0.4) {
            return '#3b82f6' // Blue for medium profitability
          } else {
            return '#ef4444' // Red for lower profitability
          }
        },
        rotateRatio: 0,
        rotationSteps: 0,
        backgroundColor: 'transparent',
        drawOutOfBound: false,
        click: (item: [string | number, number, ...unknown[]]) => {
          const w = item[0]
          if (typeof w !== 'string' || !w.trim()) return
          navigate(buildProjectsUrl({ search: w.trim(), zenithSlice: 'revenue' }, drillDateFilter))
        },
      })
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error generating word cloud:', error)
    }
    return () => {
      WordCloud.stop()
    }
  }, [cloudData, dimensions, drillDateFilter, navigate])

  const toggleFY = (fy: string) => {
    setSelectedFYs((prev) => {
      const newFYs = prev.includes(fy) ? prev.filter((f) => f !== fy) : [...prev, fy]
      // Clear months if not exactly one FY selected
      if (newFYs.length !== 1) {
        setSelectedMonths([])
        setShowMonthDropdown(false)
      }
      return newFYs
    })
  }

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    )
  }

  const clearFYFilter = () => {
    setSelectedFYs([])
    setSelectedMonths([]) // Clear months when FY is cleared
    setShowMonthDropdown(false) // Close month dropdown when FY is cleared
  }

  const clearMonthFilter = () => {
    setSelectedMonths([])
  }

  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} w-full`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Customer Projects Profitability</h2>
        </div>
        <div className="flex rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-0.5">
          <button
            type="button"
            onClick={() => setView('cloud')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'cloud'
                ? 'bg-[color:var(--bg-surface)] font-semibold text-[color:var(--text-primary)] shadow-sm ring-1 ring-[color:var(--border-default)]'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]'
            }`}
          >
            Word Cloud
          </button>
          <button
            type="button"
            onClick={() => setView('top10')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'top10'
                ? 'bg-[color:var(--bg-surface)] font-semibold text-[color:var(--text-primary)] shadow-sm ring-1 ring-[color:var(--border-default)]'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]'
            }`}
          >
            Top 10
          </button>
        </div>
      </div>

      {/* Fixed height so chart/table size does not change with empty/loading data */}
      <div className="flex flex-col relative" style={{ height: '320px' }}>
        {/* Word Cloud view – opacity + pointer-events so chart does not re-initialize on toggle */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{ opacity: view === 'cloud' ? 1 : 0, pointerEvents: view === 'cloud' ? 'auto' : 'none' }}
        >
      {/* Filters - only when not controlled by dashboard (FY, Qtr, Month at top) */}
      {!filterControlledByParent && (
      <div className="mb-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* FY Filter Dropdown */}
          <div className="relative flex-1" ref={fyDropdownRef}>
            <button
              type="button"
              onClick={() => setShowFYDropdown(!showFYDropdown)}
              className="zenith-native-select flex w-full items-center justify-between rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5 text-left text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]"
            >
              <span className={selectedFYs.length === 0 ? 'text-[color:var(--text-muted)]' : ''}>
                {selectedFYs.length === 0
                  ? 'Select FY'
                  : selectedFYs.length === 1
                    ? selectedFYs[0]
                    : `${selectedFYs.length} selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 flex-shrink-0 text-[color:var(--text-muted)] transition-transform ${
                  showFYDropdown ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFYDropdown && (
              <div className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)]">
                {availableFYs.length > 0 ? (
                  <>
                    {availableFYs.map((fy) => (
                      <label
                        key={fy}
                        className="flex cursor-pointer items-center px-4 py-2 hover:bg-[color:var(--accent-teal-muted)]/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFYs.includes(fy)}
                          onChange={() => toggleFY(fy)}
                          className="rounded border-[color:var(--border-default)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                        />
                        <span className="ml-2 text-sm text-[color:var(--text-primary)]">{fy}</span>
                      </label>
                    ))}
                    {selectedFYs.length > 0 && (
                      <div className="border-t border-[color:var(--border-default)] px-4 py-2">
                        <button
                          type="button"
                          onClick={clearFYFilter}
                          className="text-xs font-semibold text-[color:var(--accent-gold)] hover:opacity-90"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-2 text-sm text-[color:var(--text-muted)]">No FYs available</div>
                )}
              </div>
            )}
          </div>

          {/* Month Filter Dropdown */}
          <div className="relative flex-1" ref={monthDropdownRef}>
            <button
              type="button"
              onClick={() => selectedFYs.length === 1 && setShowMonthDropdown(!showMonthDropdown)}
              disabled={selectedFYs.length !== 1}
              className="zenith-native-select flex w-full items-center justify-between rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5 text-left text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={selectedMonths.length === 0 ? 'text-[color:var(--text-muted)]' : ''}>
                {selectedMonths.length === 0
                  ? 'Select Month'
                  : selectedMonths.length === 1
                    ? MONTHS.find((m) => m.value === selectedMonths[0])?.label
                    : `${selectedMonths.length} selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 flex-shrink-0 text-[color:var(--text-muted)] transition-transform ${
                  showMonthDropdown ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMonthDropdown && selectedFYs.length === 1 && (
              <div className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)]">
                {MONTHS.map((month) => (
                  <label
                    key={month.value}
                    className="flex cursor-pointer items-center px-4 py-2 hover:bg-[color:var(--accent-teal-muted)]/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month.value)}
                      onChange={() => toggleMonth(month.value)}
                      className="rounded border-[color:var(--border-default)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                    />
                    <span className="ml-2 text-sm text-[color:var(--text-primary)]">{month.label}</span>
                  </label>
                ))}
                {selectedMonths.length > 0 && (
                  <div className="border-t border-[color:var(--border-default)] px-4 py-2">
                    <button
                      type="button"
                      onClick={clearMonthFilter}
                      className="text-xs font-semibold text-[color:var(--accent-gold)] hover:opacity-90"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
            {selectedFYs.length !== 1 && (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {selectedFYs.length === 0 ? 'Select one FY to enable month filter' : 'Select only one FY to enable month filter'}
              </p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Fixed height so chart size does not change with empty/loading data */}
      <div className="flex flex-col" style={{ height: '320px' }}>
        {showLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
                aria-hidden
              />
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading...</p>
            </div>
          </div>
        ) : !cloudData || cloudData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <p className="px-4 text-center text-sm text-[color:var(--text-muted)]">
              No profitability data available for selected filters.
            </p>
          </div>
        ) : (
          <>
            <div className="w-full flex justify-center overflow-hidden flex-1 min-h-0">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto cursor-pointer"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="mt-2 flex-shrink-0 text-center text-xs text-[color:var(--text-muted)]">
              <p>Font size represents profitability percentage</p>
              <p className="mt-0.5 font-semibold text-[color:var(--accent-teal)]">Click a word to open Projects →</p>
            </div>
          </>
        )}
      </div>
        </div>

        {/* Top 10 view – same data, opacity + pointer-events so layout is stable */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden"
          style={{ opacity: view === 'top10' ? 1 : 0, pointerEvents: view === 'top10' ? 'auto' : 'none' }}
        >
          {showLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
                  aria-hidden
                />
                <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading...</p>
              </div>
            </div>
          ) : !cloudData || cloudData.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center">
              <p className="px-4 text-center text-sm text-[color:var(--text-muted)]">
                No profitability data available for selected filters.
              </p>
            </div>
          ) : (
            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] backdrop-blur-md">
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
                    <th className="w-24 py-2.5 pl-1 pr-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-default)]">
                  {[...cloudData]
                    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                    .slice(0, 10)
                    .map((row, idx) => {
                      const maxVal = Math.max(...cloudData.map((d: WordCloudData) => d.value ?? 0), 1)
                      const pct = (row.value ?? 0) / maxVal
                      return (
                        <tr
                          key={`${row.text}-${idx}`}
                          className="cursor-pointer transition-colors hover:bg-[color:var(--accent-teal-muted)]/35"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            const t = row.text?.trim()
                            if (!t) return
                            navigate(buildProjectsUrl({ search: t, zenithSlice: 'revenue' }, drillDateFilter))
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return
                            e.preventDefault()
                            const t = row.text?.trim()
                            if (!t) return
                            navigate(buildProjectsUrl({ search: t, zenithSlice: 'revenue' }, drillDateFilter))
                          }}
                        >
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-1 text-xs font-bold tabular-nums ${
                                idx === 0
                                  ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                                  : idx === 1
                                    ? 'bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]'
                                    : idx === 2
                                      ? 'bg-[color:var(--accent-gold-muted)]/70 text-[color:var(--accent-gold)]'
                                      : 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td
                            className="max-w-[140px] truncate px-2 py-2 font-medium text-[color:var(--text-primary)] sm:max-w-[220px]"
                            title={row.text}
                          >
                            {row.text}
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-semibold tabular-nums text-[color:var(--accent-teal)]">
                            {typeof row.value === 'number' ? row.value.toFixed(1) : '—'}%
                          </td>
                          <td className="py-2 pl-1 pr-2 align-middle">
                            <div className="h-2 min-w-[3.5rem] overflow-hidden rounded-full bg-[color:var(--border-default)]">
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
    </div>
  )
})

ProfitabilityWordCloud.displayName = 'ProfitabilityWordCloud'

export default ProfitabilityWordCloud
