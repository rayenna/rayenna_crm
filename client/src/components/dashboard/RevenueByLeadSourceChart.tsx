import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getLeadSourceColor } from './leadSourceColors'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from '../zenith/zenithTypes'
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

interface RevenueByLeadSourceData {
  leadSource: string
  leadSourceLabel: string
  revenue: number
  projectCount: number
}

export interface DashboardFilterState {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

interface RevenueByLeadSourceChartProps {
  availableFYs?: string[] // Available FYs for filter dropdown (when not using dashboard filter)
  /** When set, chart uses dashboard FY/Qtr/Month filter only; no chart-level filter UI. */
  dashboardFilter?: DashboardFilterState | null
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

const RevenueByLeadSourceChart = ({ availableFYs = [], dashboardFilter }: RevenueByLeadSourceChartProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = useChartColors()
  const filterControlledByParent = !!dashboardFilter
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  const effectiveFYs = filterControlledByParent
    ? (Array.isArray(dashboardFilter?.selectedFYs) ? dashboardFilter.selectedFYs : [])
    : selectedFYs
  const effectiveMonths = filterControlledByParent
    ? (Array.isArray(dashboardFilter?.selectedMonths) ? dashboardFilter.selectedMonths : [])
    : selectedMonths
  const effectiveQuarters = filterControlledByParent
    ? (Array.isArray(dashboardFilter?.selectedQuarters) ? dashboardFilter.selectedQuarters : [])
    : []

  const drillDateFilter: ZenithDateFilter = useMemo(
    () => ({
      selectedFYs: effectiveFYs,
      selectedQuarters: effectiveQuarters,
      selectedMonths: effectiveMonths,
    }),
    [effectiveFYs, effectiveQuarters, effectiveMonths],
  )

  // Role-based access: Only show for ADMIN, MANAGEMENT, SALES
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES || user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE

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

  // Clear months if FY selection changes to not exactly one FY (only when using own filters)
  useEffect(() => {
    if (!filterControlledByParent && selectedFYs.length !== 1) {
      setSelectedMonths([])
    }
  }, [filterControlledByParent, selectedFYs])

  // Fetch chart data: use dashboard filter when provided, else chart's own filters
  const { data, isLoading } = useQuery({
    queryKey: ['revenueByLeadSource', effectiveFYs, effectiveMonths, effectiveQuarters],
    queryFn: async () => {
      const params = new URLSearchParams()
      effectiveFYs.forEach((fy) => params.append('fy', fy))
      effectiveQuarters.forEach((q) => params.append('quarter', q))
      effectiveMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/revenue-by-lead-source?${params.toString()}`)
      return res.data
    },
    enabled: canView, // Only fetch if user has access
    staleTime: 30000, // Cache for 30 seconds
  })

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

  // Don't render if user doesn't have access
  if (!canView) {
    return null
  }

  const chartData = data?.revenueByLeadSource as RevenueByLeadSourceData[] || []

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
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Revenue by Lead Source</h2>
        </div>

        {!filterControlledByParent && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="relative flex-1" ref={fyDropdownRef}>
              <label className="mb-2 block text-sm font-semibold text-[color:var(--text-secondary)]">Financial Year:</label>
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
                        <label key={fy} className="flex cursor-pointer items-center px-4 py-2 hover:bg-[color:var(--accent-teal-muted)]/40">
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

            <div className="relative flex-1" ref={monthDropdownRef}>
              <label className="mb-2 block text-sm font-semibold text-[color:var(--text-secondary)]">Month:</label>
              <button
                type="button"
                onClick={() => selectedFYs.length === 1 && setShowMonthDropdown(!showMonthDropdown)}
                disabled={selectedFYs.length !== 1}
                className={`flex w-full items-center justify-between rounded-xl border border-[color:var(--border-default)] px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] ${
                  selectedFYs.length !== 1
                    ? 'cursor-not-allowed bg-[color:var(--bg-input)] opacity-50 text-[color:var(--text-muted)]'
                    : 'bg-[color:var(--bg-input)] text-[color:var(--text-primary)]'
                }`}
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
                  {selectedFYs.length === 0
                    ? 'Select one FY to enable month filter'
                    : 'Select only one FY to enable month filter'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Chart or Loading/No Data - fixed height so size does not change with empty/loading data */}
      <div className="w-full overflow-x-auto flex flex-col" style={{ height: '320px' }}>
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
                aria-hidden
              />
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading chart data...</p>
            </div>
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="px-4 text-center">
              <p className="mb-2 text-sm text-[color:var(--text-secondary)] sm:text-base">No data for selected period</p>
              <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">
                Revenue data will appear here when projects are confirmed and completed.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-w-[280px] w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60,
                }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="leadSourceLabel"
                  tick={{ fontSize: 12, fill: c.axisText }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke={c.grid}
                />
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
                      const data = payload[0].payload as RevenueByLeadSourceData
                      return (
                        <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{data.leadSourceLabel}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Total Revenue:{' '}
                            <span className="font-semibold text-[color:var(--accent-gold)]">{formatCurrency(data.revenue)}</span>
                          </p>
                          <p className={`${ZENITH_CHART_TOOLTIP_LINE} mt-1`}>
                            Projects: <span className="font-semibold text-[color:var(--accent-teal)]">{data.projectCount}</span>
                          </p>
                          {effectiveFYs.length > 0 && (
                            <p className={`${ZENITH_CHART_TOOLTIP_LINE} mt-1 text-xs`}>FY: {effectiveFYs.join(', ')}</p>
                          )}
                          {effectiveMonths.length > 0 && (
                            <p className={`${ZENITH_CHART_TOOLTIP_LINE} mt-1 text-xs`}>
                              Month:{' '}
                              {effectiveMonths
                                .map((m) => MONTHS.find((month) => month.value === m)?.label)
                                .join(', ')}
                            </p>
                          )}
                          <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Click bar to open Projects →</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue (₹)"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(_row: unknown, index: number) => {
                    const row = chartData[index]
                    if (!row?.leadSourceLabel) return
                    const href = buildZenithDrawerListProjectsHref('lead_source', row.leadSourceLabel, drillDateFilter, {
                      leadSourceMetric: 'revenue',
                    })
                    if (href) navigate(href)
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getLeadSourceColor(entry.leadSourceLabel, index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export default RevenueByLeadSourceChart
