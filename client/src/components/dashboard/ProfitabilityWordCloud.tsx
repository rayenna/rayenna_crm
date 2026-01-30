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
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement
      if (container) {
        // Calculate width: account for padding (p-4 = 16px each side = 32px total, p-6 on larger = 48px)
        const padding = window.innerWidth < 640 ? 32 : 48
        const maxWidth = container.clientWidth - padding
        const width = Math.min(maxWidth, 600)
        // Calculate height: responsive based on screen size, maintain aspect ratio
        const height = window.innerWidth < 640 
          ? Math.min(300, width * 0.75) 
          : window.innerWidth < 1024 
          ? Math.min(350, width * 0.7) 
          : Math.min(400, width * 0.67)
        setDimensions({ width, height })
      } else {
        // Fallback if container not found yet
        const fallbackWidth = window.innerWidth < 640 ? 280 : window.innerWidth < 1024 ? 400 : 500
        const fallbackHeight = window.innerWidth < 640 ? 300 : window.innerWidth < 1024 ? 350 : 400
        setDimensions({ width: fallbackWidth, height: fallbackHeight })
      }
    }

    // Initial update
    updateDimensions()
    // Update on resize with debounce
    let resizeTimeout: number
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateDimensions, 100) as unknown as number
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  useEffect(() => {
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[WordCloud Component] Data received:', data)
      console.log('[WordCloud Component] wordCloudData length:', data?.wordCloudData?.length || 0)
      if (data?.wordCloudData && data.wordCloudData.length > 0) {
        console.log('[WordCloud Component] Sample data:', data.wordCloudData.slice(0, 3))
      }
    }

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
    <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-6 flex flex-col backdrop-blur-sm h-[500px] sm:h-[550px] lg:h-[650px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </div>
        <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Customer Profitability Word Cloud
        </h2>
      </div>

      {/* Filters - only when not controlled by dashboard (FY, Qtr, Month at top) */}
      {!filterControlledByParent && (
      <div className="mb-4">
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

      <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
        {showLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        ) : !cloudData || cloudData.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <p className="text-sm text-gray-500">No profitability data available for selected filters.</p>
          </div>
        ) : (
          <>
            <div className="w-full flex justify-center overflow-hidden flex-1" style={{ minHeight: 0 }}>
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center flex-shrink-0">
              <p>Font size represents profitability percentage</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ProfitabilityWordCloud
