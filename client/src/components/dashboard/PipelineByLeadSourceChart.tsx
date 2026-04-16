import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from '../zenith/zenithTypes'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'
import { getLeadSourceColor } from './leadSourceColors'
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

export interface PipelineByLeadSourceItem {
  leadSource: string
  leadSourceLabel: string
  pipeline: number
  projectCount: number
}

interface PipelineByLeadSourceChartProps {
  data?: PipelineByLeadSourceItem[]
  dashboardFilter?: ZenithDateFilter | null
}

const PipelineByLeadSourceChart = ({ data: chartData = [], dashboardFilter }: PipelineByLeadSourceChartProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = useChartColors()
  const dateFilter: ZenithDateFilter = dashboardFilter ?? {
    selectedFYs: [],
    selectedQuarters: [],
    selectedMonths: [],
  }
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES

  if (!canView) return null

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`

  return (
    <div className={ZENITH_DASHBOARD_ANALYTICS_CARD}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Pipeline by Lead Source</h2>
        </div>
      </div>
      {/* Fixed height so chart size does not change with empty data */}
      <div className="w-full overflow-x-auto flex flex-col" style={{ height: '320px' }}>
        {!chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center px-4">
              <p className="mb-2 text-sm text-[color:var(--text-secondary)] sm:text-base">No data for selected period</p>
              <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">
                Pipeline data will appear when projects (excluding Lost) exist.
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
                      const d = payload[0].payload as PipelineByLeadSourceItem
                      return (
                        <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{d.leadSourceLabel}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Pipeline:{' '}
                            <span className="font-extrabold text-[color:var(--accent-gold)]">{formatCurrency(d.pipeline)}</span>
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
                  dataKey="pipeline"
                  name="Pipeline (₹)"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(_row: unknown, index: number) => {
                    const row = chartData[index]
                    if (!row?.leadSourceLabel) return
                    const href = buildZenithDrawerListProjectsHref('lead_source', row.leadSourceLabel, dateFilter, {
                      leadSourceMetric: 'pipeline',
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

export default PipelineByLeadSourceChart
