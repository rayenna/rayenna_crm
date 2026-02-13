import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { getLeadSourceColor } from './leadSourceColors'

export interface PipelineByLeadSourceItem {
  leadSource: string
  leadSourceLabel: string
  pipeline: number
  projectCount: number
}

interface PipelineByLeadSourceChartProps {
  data?: PipelineByLeadSourceItem[]
}

const PipelineByLeadSourceChart = ({ data: chartData = [] }: PipelineByLeadSourceChartProps) => {
  const { user } = useAuth()
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES

  if (!canView) return null

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm min-h-[360px]">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Pipeline by Lead Source
          </h2>
        </div>
      </div>
      {/* Fixed height so chart size does not change with empty data */}
      <div className="w-full overflow-x-auto flex flex-col" style={{ height: '320px' }}>
        {!chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center px-4">
              <p className="mb-2 text-sm sm:text-base text-gray-500">No data for selected period</p>
              <p className="text-xs sm:text-sm text-gray-600">Pipeline data will appear when projects (excluding Lost) exist.</p>
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="leadSourceLabel"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
                    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
                    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
                    return `₹${value.toLocaleString('en-IN')}`
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as PipelineByLeadSourceItem
                      return (
                        <div className="bg-gradient-to-br from-white to-primary-50 p-4 border-2 border-primary-200 rounded-xl shadow-2xl backdrop-blur-sm">
                          <p className="font-semibold text-gray-900 mb-2">{d.leadSourceLabel}</p>
                          <p className="text-sm text-cyan-600">
                            Pipeline: <span className="font-medium">{formatCurrency(d.pipeline)}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Projects: <span className="font-medium">{d.projectCount}</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="pipeline" name="Pipeline (₹)" radius={[4, 4, 0, 0]}>
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
