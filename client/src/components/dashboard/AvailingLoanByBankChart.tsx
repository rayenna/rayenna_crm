import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from '../zenith/zenithTypes'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { getLoanBankBarColor } from './loanBankChartColors'
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

export interface AvailingLoanByBankItem {
  bankKey: string
  bankLabel: string
  count: number
}

interface AvailingLoanByBankChartProps {
  data?: AvailingLoanByBankItem[]
  dashboardFilter?: ZenithDateFilter | null
}

const AvailingLoanByBankChart = memo(function AvailingLoanByBankChart({
  data: chartData = [],
  dashboardFilter,
}: AvailingLoanByBankChartProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const c = useChartColors()
  const dateFilter: ZenithDateFilter = useMemo(
    () =>
      dashboardFilter ?? {
        selectedFYs: [],
        selectedQuarters: [],
        selectedMonths: [],
      },
    [dashboardFilter],
  )
  const canView =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.SALES ||
    user?.role === UserRole.FINANCE
  if (!canView) return null

  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} h-full`}>
      <div className="mb-4 flex flex-shrink-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--accent-teal)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-[color:var(--text-primary)] sm:text-lg">
            Projects Availing Loans by Bank
          </h2>
        </div>
      </div>
      {/* overflow-hidden prevents scrollbar from appearing on bar click/tooltip; fixed height avoids resize flicker */}
      <div className="w-full flex flex-col min-w-0 overflow-hidden" style={{ height: '320px' }}>
        {!chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full flex-shrink-0">
            <div className="text-center px-4">
              <p className="mb-2 text-sm text-[color:var(--text-secondary)] sm:text-base">No data for selected period</p>
              <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">
                Project counts by bank will appear when projects have Availing Loan and a bank selected.
              </p>
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
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="bankLabel"
                  tick={{ fontSize: 11, fill: c.axisText }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  stroke={c.grid}
                />
                <YAxis tick={{ fontSize: 12, fill: c.axisText }} stroke={c.grid} allowDecimals={false} />
                <Tooltip
                  wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
                  cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as AvailingLoanByBankItem
                      return (
                        <div className={ZENITH_CHART_TOOLTIP_PANEL}>
                          <p className={ZENITH_CHART_TOOLTIP_TITLE}>{d.bankLabel}</p>
                          <p className={ZENITH_CHART_TOOLTIP_LINE}>
                            Projects: <span className="font-extrabold text-[color:var(--accent-gold)]">{d.count}</span>
                          </p>
                          <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Click bar to open Projects →</p>
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
                  isAnimationActive={true}
                  animationDuration={300}
                  cursor="pointer"
                  onClick={(_row: unknown, index: number) => {
                    const row = chartData[index]
                    if (!row?.bankKey) return
                    navigate(
                      buildProjectsUrl(
                        { availingLoan: true, financingBank: [row.bankKey] },
                        dateFilter,
                      ),
                    )
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.bankKey}-${index}`}
                      fill={getLoanBankBarColor(entry.bankLabel || entry.bankKey, index)}
                    />
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
