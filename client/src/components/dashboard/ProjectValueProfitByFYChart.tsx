import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'
import {
  ZENITH_RECHARTS_TOOLTIP_CURSOR,
  ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE,
  ZENITH_CHART_TOOLTIP_INSIGHT,
  ZENITH_CHART_TOOLTIP_LINE,
  ZENITH_CHART_TOOLTIP_PANEL,
  ZENITH_CHART_TOOLTIP_TITLE,
  ZENITH_DASHBOARD_ANALYTICS_CARD,
} from './zenithRechartsTooltipStyles'
import { useChartColors } from '../../hooks/useChartColors'

interface FYData {
  fy: string
  totalProjectValue: number
  totalProfit: number
}

interface ProjectValueProfitByFYChartProps {
  data?: FYData[]
  dashboardType?: 'management' | 'sales' | 'operations' | 'finance'
  /** When true, filter is the dashboard FY/Qtr/Month; use only data prop, no chart filter UI */
  filterControlledByParent?: boolean
  /** When filterControlledByParent, only show these FYs in the chart (avoids showing previous FY added for YoY tiles) */
  selectedFYsFromDashboard?: string[]
}

const ProjectValueProfitByFYChart = ({ data: initialData, dashboardType = 'management', filterControlledByParent, selectedFYsFromDashboard }: ProjectValueProfitByFYChartProps) => {
  const navigate = useNavigate()
  const c = useChartColors()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (filterControlledByParent) return
    const handleClickOutside = (event: MouseEvent) => {
      if (fyDropdownRef.current && !fyDropdownRef.current.contains(event.target as Node)) {
        setShowFYDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterControlledByParent])

  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ['projectValueProfitByFY', dashboardType, selectedFYs],
    queryFn: async () => {
      const endpoint = `/api/dashboard/${dashboardType}`
      if (selectedFYs.length === 0) {
        const res = await axiosInstance.get(endpoint)
        return res.data.projectValueProfitByFY || []
      }
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      const res = await axiosInstance.get(`${endpoint}?${params.toString()}`)
      return res.data.projectValueProfitByFY || []
    },
    enabled: !filterControlledByParent,
    staleTime: 30000,
  })

  const chartData = filterControlledByParent ? (initialData || []) : (fetchedData || initialData || [])

  if (!filterControlledByParent && isLoading) {
    return (
      <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} h-full flex-col`}>
        <div className="flex items-center justify-center" style={{ height: '320px' }}>
          <div className="text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
              aria-hidden
            />
            <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading chart data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} h-full flex-col`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold text-[color:var(--text-primary)]">
            Total Revenue and Total Profit by Financial Year
          </h2>
        </div>
      <div className="flex items-center justify-center text-[color:var(--text-muted)]" style={{ height: '320px' }}>
        <div className="px-4 text-center">
          <p className="mb-2 text-sm text-[color:var(--text-secondary)] sm:text-base">No data available.</p>
          <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">Projects with financial year information will appear here.</p>
        </div>
      </div>
      </div>
    )
  }

  // Get unique financial years for the filter dropdown
  const availableFYs = Array.from(new Set(chartData.map((item: FYData) => item.fy)))
    .filter((fy): fy is string => typeof fy === 'string' && fy !== null && fy !== '')
    .sort()

  // When filter is controlled by parent (Admin/Management/Sales), show only dashboard-selected FYs
  // so we don't show multiple columns (e.g. previous FY added for YoY tiles).
  const parentFilteredData =
    filterControlledByParent && selectedFYsFromDashboard && selectedFYsFromDashboard.length > 0
      ? chartData.filter((item: FYData) => selectedFYsFromDashboard.includes(item.fy))
      : chartData

  // Filter data based on selected financial years (chart's own dropdown when not parent-controlled)
  const filteredData =
    filterControlledByParent
      ? parentFilteredData
      : selectedFYs.length === 0
        ? chartData
        : chartData.filter((item: FYData) => selectedFYs.includes(item.fy))

  const toggleFY = (fy: string) => {
    setSelectedFYs((prev) => 
      prev.includes(fy) ? prev.filter((f) => f !== fy) : [...prev, fy]
    )
  }

  const clearFYFilter = () => {
    setSelectedFYs([])
  }

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`
  }

  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} h-full flex-col`}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">
            Revenue & Profit by Financial Year
          </h2>
        </div>
        {!filterControlledByParent && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative w-[192px]" ref={fyDropdownRef}>
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
                    {availableFYs.map((fy: string) => (
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
        </div>
        )}
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[280px]" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
          <BarChart
            data={filteredData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis dataKey="fy" tick={{ fontSize: 12, fill: c.axisText }} stroke={c.grid} />
            <YAxis
              tick={{ fontSize: 12, fill: c.axisText }}
              stroke={c.grid}
              tickFormatter={(value) => {
                if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
                if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
                if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
                return `₹${value.toLocaleString('en-IN')}`
              }}
            />
            <Tooltip
              wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
              cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                      <p className={ZENITH_CHART_TOOLTIP_TITLE}>FY: {payload[0].payload.fy}</p>
                      {payload.map((entry: any, index: number) => {
                        const isProfit = entry.dataKey === 'totalProfit'
                        const val = Number(entry.value)
                        const text = isProfit
                          ? `₹${Math.round(val).toLocaleString('en-IN')}`
                          : formatCurrency(val)
                        return (
                          <p key={index} className={ZENITH_CHART_TOOLTIP_LINE} style={{ color: entry.color }}>
                            {entry.name}: <span className="font-semibold">{text}</span>
                          </p>
                        )
                      })}
                      <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Click a bar to open Projects →</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 12, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}
            />
            <Bar
              dataKey="totalProjectValue"
              name="Total Revenue"
              fill={c.blue}
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(_row: unknown, index: number) => {
                const fy = filteredData[index]?.fy
                if (!fy) return
                const href = buildZenithDrawerListProjectsHref('fy', fy, {
                  selectedFYs: [],
                  selectedQuarters: [],
                  selectedMonths: [],
                }, { fyMetric: 'revenue' })
                if (href) navigate(href)
              }}
            />
            <Bar
              dataKey="totalProfit"
              name="Total Profit"
              fill={c.green}
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(_row: unknown, index: number) => {
                const fy = filteredData[index]?.fy
                if (!fy) return
                const href = buildZenithDrawerListProjectsHref('fy', fy, {
                  selectedFYs: [],
                  selectedQuarters: [],
                  selectedMonths: [],
                }, { fyMetric: 'profit' })
                if (href) navigate(href)
              }}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ProjectValueProfitByFYChart
