import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { SupportTicketStatus } from '../../types'
import ChartPanel from '../zenith/ChartPanel'
import { useChartColors } from '../../hooks/useChartColors'
import {
  ZENITH_CHART_TOOLTIP_INSIGHT,
  ZENITH_CHART_TOOLTIP_LINE,
  ZENITH_CHART_TOOLTIP_PANEL,
  ZENITH_CHART_TOOLTIP_TITLE,
} from '../dashboard/zenithRechartsTooltipStyles'

interface TicketStatusData {
  status: SupportTicketStatus
  label: string
  value: number
}

interface TicketStatusDonutChartProps {
  data: TicketStatusData[]
  onSliceClick?: (status: SupportTicketStatus | null) => void
  selectedStatus?: SupportTicketStatus | null
}

const TicketStatusDonutChart = ({ data, onSliceClick, selectedStatus }: TicketStatusDonutChartProps) => {
  const c = useChartColors()
  const total = data.reduce((sum, item) => item.value + sum, 0)
  const pieData = data.filter((item) => item.value > 0)

  const fillFor = (status: SupportTicketStatus) => {
    if (status === SupportTicketStatus.OPEN) return c.blue
    if (status === SupportTicketStatus.IN_PROGRESS) return c.gold
    return c.axisText
  }

  const handleClick = (entry: { status?: SupportTicketStatus }) => {
    if (!onSliceClick || !entry.status) return
    onSliceClick(selectedStatus === entry.status ? null : entry.status)
  }

  return (
    <ChartPanel
      title="By status"
      subtitle={onSliceClick ? 'Tap a slice to filter the queue' : undefined}
      showExploreHint={Boolean(onSliceClick)}
      contentClassName="min-h-[220px] relative"
    >
      <div className="h-[240px] w-full min-w-0 sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="46%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={pieData.length > 1 ? 2 : 0}
              dataKey="value"
              onClick={handleClick}
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={fillFor(entry.status)}
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
                  const slice = payload[0].payload
                  const percentage = total > 0 ? ((slice.value / total) * 100).toFixed(1) : 0
                  return (
                    <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                      <p className={ZENITH_CHART_TOOLTIP_TITLE}>{slice.label}</p>
                      <p className={ZENITH_CHART_TOOLTIP_LINE}>
                        Count:{' '}
                        <span className="font-semibold text-[color:var(--text-primary)]">{slice.value}</span>
                      </p>
                      <p className={ZENITH_CHART_TOOLTIP_LINE}>
                        Share:{' '}
                        <span className="font-semibold text-[color:var(--text-primary)]">{percentage}%</span>
                      </p>
                      {onSliceClick ? (
                        <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Tap again to clear the filter.</p>
                      ) : null}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={48}
              payload={data.map((item) => ({
                id: item.status,
                type: 'square' as const,
                color: fillFor(item.status),
                value: `${item.label}: ${item.value}`,
              }))}
              formatter={(value) => (
                <span className="text-xs text-[color:var(--text-secondary)]">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  )
}

export default TicketStatusDonutChart
