import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { SupportTicketStatus } from '../../types'

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
    <div className="w-full bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Status Breakdown</h3>
      <div className="w-full" style={{ height: '350px' }}>
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
                  stroke={selectedStatus === entry.status ? '#000' : 'none'}
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
                    <div
                      className="p-3 border border-gray-200 rounded-lg shadow-lg"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                      }}
                    >
                      <p className="font-semibold" style={{ color: '#0f172a' }}>
                        {data.label}
                      </p>
                      <p style={{ color: '#334155' }}>
                        Count: <span className="font-medium" style={{ color: '#0f172a' }}>{data.value}</span>
                      </p>
                      <p style={{ color: '#334155' }}>
                        Percentage:{' '}
                        <span className="font-medium" style={{ color: '#0f172a' }}>{percentage}%</span>
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
                <span className="text-sm">
                  {entry.payload.label}: {entry.payload.value} ({total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {onSliceClick && (
        <p className="text-xs text-gray-500 text-center mt-2">Click a slice to filter tickets</p>
      )}
    </div>
  )
}

export default TicketStatusDonutChart
