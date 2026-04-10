import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from '../zenith/zenithTypes'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'
import { getProjectStatusColor } from './projectStatusColors'

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
    <div className="h-full flex flex-col min-h-[360px] bg-white shadow-sm rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
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
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="statusLabel"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  stroke="#94a3b8"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#475569' }}
                  stroke="#94a3b8"
                  allowDecimals={false}
                />
                <Tooltip
                  wrapperStyle={{ outline: 'none', zIndex: 100 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as ProjectsByStageItem
                      return (
                        <div
                          className="p-3 sm:p-4 border border-slate-200 rounded-xl shadow-xl"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            WebkitFontSmoothing: 'antialiased',
                          }}
                        >
                          <p className="font-semibold mb-2" style={{ color: '#0f172a' }}>
                            {d.statusLabel}
                          </p>
                          <p className="text-sm" style={{ color: '#334155' }}>
                            Projects:{' '}
                            <span className="font-semibold tabular-nums" style={{ color: '#0d1b3a' }}>
                              {d.count}
                            </span>
                          </p>
                          <p className="text-xs font-medium text-amber-700 mt-1">Click bar to open Projects →</p>
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
