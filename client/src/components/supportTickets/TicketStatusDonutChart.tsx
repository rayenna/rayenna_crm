import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { SupportTicketStatus } from '../../types'
import {
  ZENITH_CHART_TOOLTIP_INSIGHT,
  ZENITH_CHART_TOOLTIP_LINE,
  ZENITH_CHART_TOOLTIP_PANEL,
  ZENITH_CHART_TOOLTIP_TITLE,
  ZENITH_DASHBOARD_ANALYTICS_CARD,
} from '../dashboard/zenithRechartsTooltipStyles'

interface TicketStatusData {
  status: SupportTicketStatus
  label: string
  value: number
  color: string
}

interface TicketStatusDonutChartProps {
  data: TicketStatusData[]
  onSliceClick?: (status: SupportTicketStatus | null) => void
  selectedStatus?: SupportTicketStatus | null
}

const TicketStatusDonutChart = ({ data, onSliceClick, selectedStatus }: TicketStatusDonutChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const handleClick = (entry: any) => {
    if (onSliceClick) {
      const clickedStatus = entry.status as SupportTicketStatus
      // Toggle: if already selected, deselect
      if (selectedStatus === clickedStatus) {
        onSliceClick(null)
      } else {
        onSliceClick(clickedStatus)
      }
    }
  }

  return (
    <div className={`zenith-segment-donut-card w-full p-6 ${ZENITH_DASHBOARD_ANALYTICS_CARD}`}>
      <h3 className="zenith-display mb-4 text-lg font-semibold text-[color:var(--text-primary)]">Ticket Status Breakdown</h3>
      {/* Fixed height: Pie uses fixed outerRadius; a flex-grown container clips the ring */}
      <div className="zenith-chart-slot h-[350px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              onClick={handleClick}
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={selectedStatus && selectedStatus !== entry.status ? 0.3 : 1}
                  stroke={selectedStatus === entry.status ? 'var(--accent-gold)' : 'none'}
                  strokeWidth={selectedStatus === entry.status ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              content={({
                active,
                payload,
              }: {
                active?: boolean
                payload?: Array<{ payload?: TicketStatusData }>
              }) => {
                if (active && payload && payload.length && payload[0].payload) {
                  const data = payload[0].payload
                  const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
                  return (
                    <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                      <p className={ZENITH_CHART_TOOLTIP_TITLE}>{data.label}</p>
                      <p className={ZENITH_CHART_TOOLTIP_LINE}>
                        Count:{' '}
                        <span className="font-semibold text-[color:var(--text-primary)]">
                          {data.value}
                        </span>
                      </p>
                      <p className={ZENITH_CHART_TOOLTIP_LINE}>
                        Percentage:{' '}
                        <span className="font-semibold text-[color:var(--text-primary)]">
                          {percentage}%
                        </span>
                      </p>
                      <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>
                        Click again to clear the filter.
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={60}
              formatter={(_value, entry: any) => (
                <span className="text-sm text-[color:var(--text-secondary)]">
                  {entry.payload.label}: {entry.payload.value} ({total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {onSliceClick && (
        <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">Click a slice to filter tickets</p>
      )}
    </div>
  )
}

export default TicketStatusDonutChart
