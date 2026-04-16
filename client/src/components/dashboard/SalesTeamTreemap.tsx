import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { getSalesTeamColor } from './salesTeamColors'
import { salesTeamPerformanceQueryKey } from '../../utils/salesTeamPerformanceQuery'
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

interface SalesTeamData {
  salespersonId: string
  salespersonName: string
  totalOrderValue: number
  projectCount: number
}

interface DashboardFilterState {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

interface SalesTeamTreemapProps {
  availableFYs?: string[] // Available FYs from dashboard data (when not using dashboard filter)
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

// Column chart doesn't need custom content component

const SalesTeamTreemap = ({ availableFYs = [], dashboardFilter }: SalesTeamTreemapProps) => {
  const navigate = useNavigate()
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

  const dateFilter = useMemo(
    () => ({
      selectedFYs: effectiveFYs,
      selectedQuarters: effectiveQuarters,
      selectedMonths: effectiveMonths,
    }),
    [effectiveFYs, effectiveQuarters, effectiveMonths],
  )

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

  // Fetch sales team performance: use dashboard filter when provided, else chart's own filters
  const { data, isLoading } = useQuery({
    queryKey: salesTeamPerformanceQueryKey(effectiveFYs, effectiveMonths, effectiveQuarters),
    queryFn: async () => {
      const params = new URLSearchParams()
      effectiveFYs.forEach((fy) => params.append('fy', fy))
      effectiveQuarters.forEach((q) => params.append('quarter', q))
      effectiveMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/sales-team-performance?${params.toString()}`)
      return res.data
    },
    enabled: true, // Always fetch, even with no filters (shows all data)
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
    setSelectedMonths((prev) => (prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]))
  }

  const clearFYFilter = () => {
    setSelectedFYs([])
    setSelectedMonths([]) // Clear months when FY is cleared
    setShowMonthDropdown(false) // Close month dropdown when FY is cleared
  }

  const clearMonthFilter = () => {
    setSelectedMonths([])
  }

  // Prepare data for treemap (fill by salesperson name so colors match Revenue by Sales Team chart)
  const treemapData =
    data?.salesTeamData?.map((item: SalesTeamData, index: number) => ({
      name: item.salespersonName,
      salespersonId: item.salespersonId,
      value: item.totalOrderValue,
      projectCount: item.projectCount,
      fill: getSalesTeamColor(item.salespersonName, index),
    })) || []

  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} h-full flex-col`}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Pipeline by Sales Team Member</h2>
        </div>

        {!filterControlledByParent && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="relative" ref={fyDropdownRef}>
              <button
                type="button"
                onClick={() => setShowFYDropdown(!showFYDropdown)}
                className="zenith-native-select flex min-w-[180px] w-full items-center justify-between rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--accent-teal-muted)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] sm:w-auto"
              >
                <span>
                  {selectedFYs.length === 0
                    ? 'All Financial Years'
                    : selectedFYs.length === 1
                      ? selectedFYs[0]
                      : `${selectedFYs.length} FYs selected`}
                </span>
                <svg
                  className={`ml-2 h-4 w-4 text-[color:var(--text-muted)] transition-transform ${showFYDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showFYDropdown && (
                <div className="absolute z-10 mt-2 max-h-60 w-full min-w-[200px] overflow-auto rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] sm:w-auto">
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

            <div className="relative" ref={monthDropdownRef}>
              <button
                type="button"
                onClick={() => selectedFYs.length === 1 && setShowMonthDropdown(!showMonthDropdown)}
                disabled={selectedFYs.length !== 1}
                className={`zenith-native-select flex min-w-[180px] w-full items-center justify-between rounded-xl border border-[color:var(--border-default)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] sm:w-auto ${
                  selectedFYs.length !== 1
                    ? 'cursor-not-allowed bg-[color:var(--bg-input)] text-[color:var(--text-muted)] opacity-50'
                    : 'bg-[color:var(--bg-input)] text-[color:var(--text-primary)] hover:bg-[color:var(--accent-teal-muted)]/30'
                }`}
              >
                <span>
                  {selectedMonths.length === 0
                    ? 'All Months'
                    : selectedMonths.length === 1
                      ? MONTHS.find((m) => m.value === selectedMonths[0])?.label || selectedMonths[0]
                      : `${selectedMonths.length} months selected`}
                </span>
                <svg
                  className={`ml-2 h-4 w-4 transition-transform ${showMonthDropdown ? 'rotate-180' : ''} ${
                    selectedFYs.length !== 1 ? 'text-[color:var(--text-muted)]' : 'text-[color:var(--text-muted)]'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showMonthDropdown && selectedFYs.length === 1 && (
                <div className="absolute z-10 mt-2 max-h-60 w-full min-w-[200px] overflow-auto rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] sm:w-auto">
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

      {/* Column Chart - fixed height so size does not change with empty/loading data */}
      <div className="flex flex-col" style={{ height: '320px' }}>
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
                aria-hidden
              />
              <p className="mt-3 text-sm text-[color:var(--text-muted)]">Loading...</p>
            </div>
          </div>
        ) : !treemapData || treemapData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <p className="px-4 text-center text-[color:var(--text-muted)]">No sales team data available for the selected filters</p>
          </div>
        ) : (
          <div className="h-full min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <BarChart
                data={treemapData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12, fill: c.axisText }}
                  stroke={c.grid}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: c.axisText }}
                  stroke={c.grid}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
                  cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{data.name}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Total Order Value:{' '}
                            <span className="font-semibold text-[color:var(--accent-gold)]">
                              ₹{data.value.toLocaleString('en-IN')}
                            </span>
                          </p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Projects:{' '}
                            <span className="font-semibold text-[color:var(--accent-teal)]">{data.projectCount}</span>
                          </p>
                          <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Click bar to open Projects →</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Total Order Value"
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                  onClick={(_row: unknown, index: number) => {
                    const row = treemapData[index] as
                      | { salespersonId?: string; name?: string }
                      | undefined
                    if (!row) return
                    const id = row.salespersonId?.trim()
                    const href =
                      id && id.length > 0
                        ? buildProjectsUrl({ salespersonId: [id], zenithSlice: 'pipeline' }, dateFilter)
                        : buildProjectsUrl({ salespersonUnassigned: true, zenithSlice: 'pipeline' }, dateFilter)
                    navigate(href)
                  }}
                >
                  {treemapData.map((entry: { fill: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
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

export default SalesTeamTreemap
