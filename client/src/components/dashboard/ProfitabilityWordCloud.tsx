import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import WordCloud from 'wordcloud'

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

const ProfitabilityWordCloud = ({ availableFYs = [], wordCloudData: wordCloudDataProp, filterControlledByParent }: ProfitabilityWordCloudProps) => {
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
      })
    } catch (error) {
      console.error('Error generating word cloud:', error)
    }
  }, [cloudData, dimensions])

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
    <div className="w-full min-h-[360px] flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Customer Projects Profitability
          </h2>
        </div>
        <div className="flex rounded-lg border border-primary-200/60 bg-primary-50/30 p-0.5">
          <button
            type="button"
            onClick={() => setView('cloud')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'cloud' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-primary-600'
            }`}
          >
            Word Cloud
          </button>
          <button
            type="button"
            onClick={() => setView('top10')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'top10' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-primary-600'
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
              className="w-full text-left border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between"
            >
              <span className={selectedFYs.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
                {selectedFYs.length === 0
                  ? 'Select FY'
                  : selectedFYs.length === 1
                  ? selectedFYs[0]
                  : `${selectedFYs.length} selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
                  showFYDropdown ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFYDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {availableFYs.length > 0 ? (
                  <>
                    {availableFYs.map((fy) => (
                      <label
                        key={fy}
                        className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFYs.includes(fy)}
                          onChange={() => toggleFY(fy)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{fy}</span>
                      </label>
                    ))}
                    {selectedFYs.length > 0 && (
                      <div className="border-t border-gray-200 px-4 py-2">
                        <button
                          type="button"
                          onClick={clearFYFilter}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500">No FYs available</div>
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
              className="w-full text-left border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <span className={selectedMonths.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
                {selectedMonths.length === 0
                  ? 'Select Month'
                  : selectedMonths.length === 1
                  ? MONTHS.find((m) => m.value === selectedMonths[0])?.label
                  : `${selectedMonths.length} selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
                  showMonthDropdown ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMonthDropdown && selectedFYs.length === 1 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {MONTHS.map((month) => (
                  <label
                    key={month.value}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month.value)}
                      onChange={() => toggleMonth(month.value)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">{month.label}</span>
                  </label>
                ))}
                {selectedMonths.length > 0 && (
                  <div className="border-t border-gray-200 px-4 py-2">
                    <button
                      type="button"
                      onClick={clearMonthFilter}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
            {selectedFYs.length !== 1 && (
              <p className="mt-1 text-xs text-gray-500">
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
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        ) : !cloudData || cloudData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <p className="text-sm text-gray-500 text-center px-4">No profitability data available for selected filters.</p>
          </div>
        ) : (
          <>
            <div className="w-full flex justify-center overflow-hidden flex-1 min-h-0">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center flex-shrink-0">
              <p>Font size represents profitability percentage</p>
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
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                <p className="mt-4 text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          ) : !cloudData || cloudData.length === 0 ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-sm text-gray-500 text-center px-4">No profitability data available for selected filters.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-primary-200/50 shadow-inner" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-primary-100/90 to-purple-100/80 border-b-2 border-primary-200/70 shadow-sm">
                  <tr>
                    <th className="text-center py-3 px-3 w-14 font-bold text-primary-800 text-xs uppercase tracking-wider">#</th>
                    <th className="text-left py-3 px-3 font-bold text-primary-800 text-xs uppercase tracking-wider">Project</th>
                    <th className="text-right py-3 px-3 w-20 font-bold text-primary-800 text-xs uppercase tracking-wider">Margin</th>
                    <th className="py-3 pl-2 pr-3 w-28 font-bold text-primary-800 text-xs uppercase tracking-wider"> </th>
                  </tr>
                </thead>
                <tbody className="bg-white/80 divide-y divide-primary-100/70">
                  {[...cloudData]
                    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                    .slice(0, 10)
                    .map((row, idx) => {
                      const maxVal = Math.max(...cloudData.map((d: WordCloudData) => d.value ?? 0), 1)
                      const pct = (row.value ?? 0) / maxVal
                      return (
                        <tr key={`${row.text}-${idx}`} className="hover:bg-primary-50/40 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold ${
                              idx === 0 ? 'bg-amber-100 text-amber-800' :
                              idx === 1 ? 'bg-gray-200 text-gray-700' :
                              idx === 2 ? 'bg-amber-200/80 text-amber-900' :
                              'bg-primary-100 text-primary-700'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-800 truncate max-w-[180px]" title={row.text}>{row.text}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-primary-700 tabular-nums">
                            {typeof row.value === 'number' ? row.value.toFixed(1) : '—'}%
                          </td>
                          <td className="py-2.5 pl-2 pr-3 align-middle">
                            <div className="h-2.5 rounded-full bg-primary-100 overflow-hidden min-w-[4rem]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-purple-500 transition-all duration-300"
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
}

export default ProfitabilityWordCloud
