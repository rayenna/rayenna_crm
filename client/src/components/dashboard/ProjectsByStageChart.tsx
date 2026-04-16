import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from '../zenith/zenithTypes'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'
import { getProjectStatusColor } from './projectStatusColors'
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

export interface ProjectsByStageItem {
  status: string
  statusLabel: string
  count: number
}

interface ProjectsByStageChartProps {
  data?: ProjectsByStageItem[]
  /** Dashboard FY / Quarter / Month — included in Projects drill URL. */
  dashboardFilter?: ZenithDateFilter | null
}

const ProjectsByStageChart = ({ data: chartData = [], dashboardFilter }: ProjectsByStageChartProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = useChartColors()
  const dateFilter: ZenithDateFilter = dashboardFilter ?? {
    selectedFYs: [],
    selectedQuarters: [],
    selectedMonths: [],
  }
  const canView =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.SALES ||
    user?.role === UserRole.OPERATIONS

  if (!canView) return null

  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} h-full`}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-gold)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">
            Projects by Stage / Execution Status
          </h2>
        </div>
      </div>
      {/* Fixed height so chart size does not change with empty data; horizontal scroll for narrow viewports */}
      <div className="w-full overflow-x-auto flex flex-col min-w-0" style={{ height: '320px' }}>
        {!chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center px-4">
              <p className="mb-2 text-sm text-[color:var(--text-secondary)] sm:text-base">No data for selected period</p>
              <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">Project counts by stage will appear when projects exist.</p>
            </div>
          </div>
        ) : (
          <div className="min-w-[280px] w-full h-full min-h-0" style={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="statusLabel"
                  tick={{ fontSize: 11, fill: c.axisText }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  stroke={c.grid}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: c.axisText }}
                  stroke={c.grid}
                  allowDecimals={false}
                />
                <Tooltip
                  wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
                  cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as ProjectsByStageItem
                      return (
                        <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{d.statusLabel}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Projects:{' '}
                            <span className="font-extrabold tabular-nums text-[color:var(--accent-gold)]">{d.count}</span>
                          </p>
                          <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Click bar to open Projects →</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Projects"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(_row: unknown, index: number) => {
                    const row = chartData[index]
                    if (!row?.statusLabel) return
                    const href = buildZenithDrawerListProjectsHref('stage', row.statusLabel, dateFilter)
                    if (href) navigate(href)
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getProjectStatusColor(entry.status, index)} />
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

export default ProjectsByStageChart
