import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { getProjectStatusColor } from './projectStatusColors'

export interface ProjectsByStageItem {
  status: string
  statusLabel: string
  count: number
}

interface ProjectsByStageChartProps {
  data?: ProjectsByStageItem[]
}

const ProjectsByStageChart = ({ data: chartData = [] }: ProjectsByStageChartProps) => {
  const { user } = useAuth()
  const canView =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.SALES ||
    user?.role === UserRole.OPERATIONS

  if (!canView) return null

  return (
    <div className="h-full flex flex-col min-h-[360px] bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Projects by Stage / Execution Status
          </h2>
        </div>
      </div>
      {/* Fixed height so chart size does not change with empty data; horizontal scroll for narrow viewports */}
      <div className="w-full overflow-x-auto flex flex-col min-w-0" style={{ height: '320px' }}>
        {!chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center px-4">
              <p className="mb-2 text-sm sm:text-base text-gray-500">No data for selected period</p>
              <p className="text-xs sm:text-sm text-gray-600">Project counts by stage will appear when projects exist.</p>
            </div>
          </div>
        ) : (
          <div className="min-w-[280px] w-full h-full min-h-0" style={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="statusLabel"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as ProjectsByStageItem
                      return (
                        <div className="bg-gradient-to-br from-white to-primary-50 p-4 border-2 border-primary-200 rounded-xl shadow-2xl backdrop-blur-sm">
                          <p className="font-semibold text-gray-900 mb-2">{d.statusLabel}</p>
                          <p className="text-sm text-indigo-600">
                            Projects: <span className="font-medium">{d.count}</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
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
