import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getSegmentColor } from './segmentColors'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
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

interface ProjectValueByType {
  type: string
  label: string
  value: number
  count: number
  percentage: string
}

interface ProjectValuePieChartProps {
  data?: ProjectValueByType[] // Optional - chart will fetch its own data if not provided
  availableFYs?: string[] // Available financial years from dashboard
  dashboardType?: 'management' | 'sales' | 'operations' | 'finance'
  filterControlledByParent?: boolean
  /** When `filterControlledByParent`, FY/Q/M from dashboard for Projects drill URLs. */
  dashboardFilter?: ZenithDateFilter | null
}

// Fixed size for stability; percentages shown in Legend/Tooltip only
const DONUT_SIZE = 200 // diameter
const OUTER_R = DONUT_SIZE / 2
const INNER_R = OUTER_R * 0.55

const ProjectValuePieChart = memo(
  ({
    data: initialData,
    availableFYs = [],
    dashboardType = 'management',
    filterControlledByParent,
    dashboardFilter,
  }: ProjectValuePieChartProps) => {
  const navigate = useNavigate()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fyDropdownRef.current && !fyDropdownRef.current.contains(event.target as Node)) {
        setShowFYDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Fetch available FYs if not provided
  const { data: fyData } = useQuery({
    queryKey: ['dashboard', dashboardType, 'fys'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/dashboard/${dashboardType}`)
      return res.data
    },
    enabled: availableFYs.length === 0, // Only fetch if availableFYs not provided
    staleTime: 300000, // Cache for 5 minutes
  })

  const finalAvailableFYs = availableFYs.length > 0 
    ? availableFYs 
    : fyData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []

  const { data: filteredData, isLoading: isLoadingFiltered } = useQuery({
    queryKey: ['projectValueByType', dashboardType, selectedFYs],
    queryFn: async () => {
      const endpoint = `/api/dashboard/${dashboardType}`
      if (selectedFYs.length === 0) {
        const res = await axiosInstance.get(endpoint)
        return res.data.projectValueByType || []
      }
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      const res = await axiosInstance.get(`${endpoint}?${params.toString()}`)
      return res.data.projectValueByType || []
    },
    enabled: !filterControlledByParent,
    staleTime: 30000,
  })

  const chartData = filterControlledByParent ? (initialData || []) : (filteredData || initialData || [])

  const drillDateFilter: ZenithDateFilter = useMemo(() => {
    if (filterControlledByParent && dashboardFilter) {
      return {
        selectedFYs: dashboardFilter.selectedFYs ?? [],
        selectedQuarters: dashboardFilter.selectedQuarters ?? [],
        selectedMonths: dashboardFilter.selectedMonths ?? [],
      }
    }
    return {
      selectedFYs: selectedFYs,
      selectedQuarters: [],
      selectedMonths: [],
    }
  }, [filterControlledByParent, dashboardFilter, selectedFYs])

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} w-full flex-col`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Revenue by Customer Segment</h2>
        </div>
        <div className="flex items-center justify-center text-[color:var(--text-muted)]" style={{ height: '320px' }}>
          <p>No project data available</p>
        </div>
      </div>
    )
  }

  // Use chart data (already filtered by chart's own filter)
  const displayData = chartData

  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} w-full flex-col`}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Revenue by Customer Segment</h2>
        </div>
        {!filterControlledByParent && finalAvailableFYs && finalAvailableFYs.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-[192px]" ref={fyDropdownRef}>
              <button
                type="button"
                onClick={() => setShowFYDropdown(!showFYDropdown)}
                disabled={isLoadingFiltered}
                className="zenith-native-select flex w-full items-center justify-between rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5 text-left text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] disabled:cursor-not-allowed disabled:opacity-60"
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
                  {finalAvailableFYs.length > 0 ? (
                    <>
                      {finalAvailableFYs.map((fy: string) => (
                        <label
                          key={fy}
                          className="flex cursor-pointer items-center px-4 py-2 hover:bg-[color:var(--accent-teal-muted)]/40"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFYs.includes(fy)}
                            onChange={() => {
                              setSelectedFYs((prev) =>
                                prev.includes(fy) ? prev.filter((f) => f !== fy) : [...prev, fy],
                              )
                            }}
                            className="rounded border-[color:var(--border-default)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                          />
                          <span className="ml-2 text-sm text-[color:var(--text-primary)]">{fy}</span>
                        </label>
                      ))}
                      {selectedFYs.length > 0 && (
                        <div className="border-t border-[color:var(--border-default)] px-4 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedFYs([])}
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
            {isLoadingFiltered && <span className="text-xs text-[color:var(--text-muted)]">Loading...</span>}
          </div>
        )}
      </div>
      {/* On mobile portrait use visible so chart isn’t clipped when page scrolls; from sm up allow horizontal scroll */}
      <div className="w-full flex justify-center" style={{ height: '320px' }}>
        <div className="flex flex-col items-center justify-center">
          <div style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <PieChart>
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={INNER_R}
                  outerRadius={OUTER_R}
                  labelLine={false}
                  label={false}
                  fill="#8884d8"
                  dataKey="value"
                  cursor="pointer"
                  onClick={(_: unknown, index: number) => {
                    const slice = displayData[index]
                    if (!slice?.label) return
                    const href = buildZenithDrawerListProjectsHref('customer_segment', slice.label, drillDateFilter, {
                      segmentChart: 'revenue',
                    })
                    if (href) navigate(href)
                  }}
                >
                  {displayData.map((item: ProjectValueByType, index: number) => (
                    <Cell key={`cell-${index}`} fill={getSegmentColor(item.type, index)} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
                  cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
                  content={({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ProjectValueByType }> }) => {
                    if (active && payload && payload.length && payload[0].payload) {
                      const data = payload[0].payload
                      return (
                        <div className={`${ZENITH_CHART_TOOLTIP_PANEL} text-xs sm:text-sm`}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{data.label}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Revenue:{' '}
                            <span className="font-extrabold text-[color:var(--accent-gold)]">
                              ₹{data.value.toLocaleString('en-IN')}
                            </span>
                          </p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Percentage:{' '}
                            <span className="font-extrabold text-[color:var(--accent-teal)]">{data.percentage}%</span>
                          </p>
                          <p className={`${ZENITH_CHART_TOOLTIP_LINE} mt-1 text-xs`}>
                            Projects: <span className="font-extrabold text-[color:var(--chart-tooltip-fg)]">{data.count}</span>
                          </p>
                          <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Click slice to open Projects →</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend below donut: percentages visible; scrolls with chart */}
          <div className="mt-2 flex min-w-0 max-w-full flex-wrap justify-center gap-x-4 gap-y-1 px-2 text-sm font-semibold text-[color:var(--text-secondary)]">
            {displayData.map((item: ProjectValueByType, index: number) => (
              <span key={item.type} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getSegmentColor(item.type, index) }} />
                <span>{item.label}: {item.percentage}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

ProjectValuePieChart.displayName = 'ProjectValuePieChart'

export default ProjectValuePieChart
