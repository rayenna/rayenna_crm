import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from '../zenith/zenithTypes'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'
import { getSegmentColor } from './segmentColors'
import {
  ZENITH_RECHARTS_TOOLTIP_CURSOR,
  ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE,
  ZENITH_CHART_TOOLTIP_INSIGHT,
  ZENITH_CHART_TOOLTIP_LINE,
  ZENITH_CHART_TOOLTIP_PANEL,
  ZENITH_CHART_TOOLTIP_TITLE,
  ZENITH_DASHBOARD_ANALYTICS_CARD,
} from './zenithRechartsTooltipStyles'

export interface PipelineBySegmentItem {
  type: string
  label: string
  value: number
  count: number
  percentage: string
}

interface PipelineByCustomerSegmentPieChartProps {
  data?: PipelineBySegmentItem[]
  dashboardFilter?: ZenithDateFilter | null
}

// Fixed size for stability; percentages shown in legend/tooltip only
const DONUT_SIZE = 200
const OUTER_R = DONUT_SIZE / 2
const INNER_R = OUTER_R * 0.55

const PipelineByCustomerSegmentPieChart = memo(({ data: chartData = [], dashboardFilter }: PipelineByCustomerSegmentPieChartProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const dateFilter: ZenithDateFilter = useMemo(
    () =>
      dashboardFilter ?? {
        selectedFYs: [],
        selectedQuarters: [],
        selectedMonths: [],
      },
    [dashboardFilter],
  )

  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES

  if (!canView) return null

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
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Pipeline by Customer Segment</h2>
        </div>
        <div className="flex items-center justify-center text-[color:var(--text-muted)]" style={{ height: '320px' }}>
          <p>No pipeline data available</p>
        </div>
      </div>
    )
  }

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
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">Pipeline by Customer Segment</h2>
        </div>
      </div>
      {/* On mobile portrait use visible so chart isn’t clipped when page scrolls; from sm up allow horizontal scroll */}
      <div className="w-full flex justify-center" style={{ height: '320px' }}>
        <div className="flex flex-col items-center justify-center">
          <div style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <PieChart>
                <Pie
                  data={chartData}
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
                    const slice = chartData[index]
                    if (!slice?.label) return
                    const href = buildZenithDrawerListProjectsHref('customer_segment', slice.label, dateFilter, {
                      segmentChart: 'pipeline',
                    })
                    if (href) navigate(href)
                  }}
                >
                  {chartData.map((item: PipelineBySegmentItem, index: number) => (
                    <Cell key={`cell-${index}`} fill={getSegmentColor(item.type, index)} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
                  cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
                  content={({
                    active,
                    payload,
                  }: {
                    active?: boolean
                    payload?: Array<{ payload?: PipelineBySegmentItem }>
                  }) => {
                    if (active && payload && payload.length && payload[0].payload) {
                      const data = payload[0].payload
                      return (
                        <div className={`${ZENITH_CHART_TOOLTIP_PANEL} text-xs sm:text-sm`}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{data.label}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Pipeline:{' '}
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
            {chartData.map((item: PipelineBySegmentItem, index: number) => (
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

PipelineByCustomerSegmentPieChart.displayName = 'PipelineByCustomerSegmentPieChart'

export default PipelineByCustomerSegmentPieChart
