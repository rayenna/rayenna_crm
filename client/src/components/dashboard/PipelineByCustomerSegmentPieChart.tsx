import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { getSegmentColor } from './segmentColors'

export interface PipelineBySegmentItem {
  type: string
  label: string
  value: number
  count: number
  percentage: string
}

interface PipelineByCustomerSegmentPieChartProps {
  data?: PipelineBySegmentItem[]
}

// Fixed size for stability; percentages shown in legend/tooltip only
const DONUT_SIZE = 200
const OUTER_R = DONUT_SIZE / 2
const INNER_R = OUTER_R * 0.55

const PipelineByCustomerSegmentPieChart = ({ data: chartData = [] }: PipelineByCustomerSegmentPieChartProps) => {
  const { user } = useAuth()

  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES

  if (!canView) return null

  if (!chartData || chartData.length === 0) {
    return (
      <div className="mobile-paint-anchor w-full min-h-[360px] flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Pipeline by Customer Segment
          </h2>
        </div>
        <div className="flex items-center justify-center text-gray-500" style={{ height: '320px' }}>
          <p>No pipeline data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-paint-anchor w-full min-h-[360px] flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Pipeline by Customer Segment
          </h2>
        </div>
      </div>
      {/* Horizontal scroll so donut + legend always viewable */}
      <div className="w-full overflow-x-auto overflow-y-visible flex justify-center isolate" style={{ height: '320px' }}>
        <div className="flex flex-col items-center justify-center min-w-[320px] w-max mx-auto py-2" style={{ minHeight: 316 }}>
          <div className="flex-shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
            <ResponsiveContainer width={DONUT_SIZE} height={DONUT_SIZE} debounce={250} minWidth={0}>
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
                >
                  {chartData.map((item: PipelineBySegmentItem, index: number) => (
                    <Cell key={`cell-${index}`} fill={getSegmentColor(item.type, index)} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-2 sm:p-3 border border-gray-200 rounded-lg shadow-lg text-xs sm:text-sm">
                          <p className="font-semibold text-gray-900">{data.label}</p>
                          <p className="text-gray-600">
                            Pipeline: <span className="font-medium text-primary-600">₹{data.value.toLocaleString('en-IN')}</span>
                          </p>
                          <p className="text-gray-600">
                            Percentage: <span className="font-medium text-primary-600">{data.percentage}%</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Projects: {data.count}</p>
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
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-2 text-sm font-medium text-gray-700 min-w-0 max-w-full">
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
}

export default PipelineByCustomerSegmentPieChart
