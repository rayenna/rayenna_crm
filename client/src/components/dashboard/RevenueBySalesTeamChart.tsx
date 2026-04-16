import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
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

export interface RevenueBySalesTeamItem {
  salespersonId: string | null
  salespersonName: string
  revenue: number
  projectCount: number
}

export interface DashboardFilterState {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

interface RevenueBySalesTeamChartProps {
  /** When provided (e.g. Sales view), chart fetches from sales-team-performance API with same filters as Pipeline by Sales Team Member */
  dashboardFilter?: DashboardFilterState | null
  availableFYs?: string[]
  /** When not using dashboardFilter (e.g. Management view), use this data from parent */
  data?: RevenueBySalesTeamItem[]
}

const RevenueBySalesTeamChart = ({ dashboardFilter, data: dataProp = [] }: RevenueBySalesTeamChartProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = useChartColors()
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES || user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE

  const dateFilter = {
    selectedFYs: dashboardFilter?.selectedFYs ?? [],
    selectedQuarters: dashboardFilter?.selectedQuarters ?? [],
    selectedMonths: dashboardFilter?.selectedMonths ?? [],
  }
  const effectiveFYs = dateFilter.selectedFYs
  const effectiveQuarters = dateFilter.selectedQuarters
  const effectiveMonths = dateFilter.selectedMonths

  const { data: fetchedData, isLoading } = useQuery({
    queryKey: salesTeamPerformanceQueryKey(effectiveFYs, effectiveMonths, effectiveQuarters),
    queryFn: async () => {
      const params = new URLSearchParams()
      effectiveFYs.forEach((fy) => params.append('fy', fy))
      effectiveQuarters.forEach((q) => params.append('quarter', q))
      effectiveMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/sales-team-performance?${params.toString()}`)
      return res.data
    },
    enabled: canView && !!dashboardFilter,
    staleTime: 30000,
  })

  const chartData = dashboardFilter ? (fetchedData?.revenueBySalesperson ?? []) : dataProp

  if (!canView) return null

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`

  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} flex-col`}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">
            Revenue by Sales Team Member
          </h2>
        </div>
      </div>
      {/* Fixed height so chart size does not change with empty/loading data */}
      <div className="w-full overflow-x-auto flex flex-col" style={{ height: '320px' }}>
        {dashboardFilter && isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center">
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
                aria-hidden
              />
              <p className="mt-4 text-sm text-[color:var(--text-secondary)]">Loading chart data...</p>
            </div>
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center px-4">
              <p className="mb-2 text-sm text-[color:var(--text-secondary)] sm:text-base">No data for selected period</p>
              <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">
                Revenue data will appear when confirmed/completed projects exist.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-w-[280px] w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="salespersonName"
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
                      const d = payload[0].payload as RevenueBySalesTeamItem
                      return (
                        <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{d.salespersonName}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Revenue:{' '}
                            <span className="font-extrabold text-[color:var(--accent-gold)]">{formatCurrency(d.revenue)}</span>
                          </p>
                          <p className={`${ZENITH_CHART_TOOLTIP_LINE} mt-1`}>
                            Projects:{' '}
                            <span className="font-extrabold text-[color:var(--accent-teal)]">{d.projectCount}</span>
                          </p>
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
                    const d = chartData[index] as RevenueBySalesTeamItem | undefined
                    if (!d) return
                    const id = d.salespersonId?.trim()
                    const href =
                      id && id.length > 0
                        ? buildProjectsUrl({ salespersonId: [id], zenithSlice: 'revenue' }, dateFilter)
                        : buildProjectsUrl({ salespersonUnassigned: true, zenithSlice: 'revenue' }, dateFilter)
                    navigate(href)
                  }}
                >
                  {chartData.map((entry: RevenueBySalesTeamItem, index: number) => (
                    <Cell key={`cell-${index}`} fill={getSalesTeamColor(entry.salespersonName, index)} />
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

export default RevenueBySalesTeamChart
