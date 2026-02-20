import { memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'

export interface AvailingLoanByBankItem {
  bankKey: string
  bankLabel: string
  count: number
}

interface AvailingLoanByBankChartProps {
  data?: AvailingLoanByBankItem[]
}

// Same visual palette as Projects by Stage (indigo/violet/teal spectrum) for consistent look
const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#64748b',
]

function getBarColor(_bankKey: string, index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

const AvailingLoanByBankChart = memo(function AvailingLoanByBankChart({ data: chartData = [] }: AvailingLoanByBankChartProps) {
  const { user } = useAuth()
  const canView =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.SALES ||
    user?.role === UserRole.FINANCE
  if (!canView) return null

  return (
    <div className="h-full flex flex-col min-h-[360px] bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Projects Availing Loans by Bank
          </h2>
        </div>
      </div>
      {/* overflow-hidden prevents scrollbar from appearing on bar click/tooltip; fixed height avoids resize flicker */}
      <div className="w-full flex flex-col min-w-0 overflow-hidden" style={{ height: '320px' }}>
        {!chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full flex-shrink-0">
            <div className="text-center px-4">
              <p className="mb-2 text-sm sm:text-base text-gray-500">No data for selected period</p>
              <p className="text-xs sm:text-sm text-gray-600">Project counts by bank will appear when projects have Availing Loan and a bank selected.</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full min-h-0 min-w-0 overflow-hidden" style={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={400} minWidth={0}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="bankLabel"
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
                      const d = payload[0].payload as AvailingLoanByBankItem
                      return (
                        <div className="bg-gradient-to-br from-white to-primary-50 p-4 border-2 border-primary-200 rounded-xl shadow-2xl backdrop-blur-sm">
                          <p className="font-semibold text-gray-900 mb-2">{d.bankLabel}</p>
                          <p className="text-sm text-indigo-600">
                            Projects: <span className="font-medium">{d.count}</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={300}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${entry.bankKey}-${index}`} fill={getBarColor(entry.bankKey, index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
})

export default AvailingLoanByBankChart
