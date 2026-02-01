import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'

export interface RevenueBySalesTeamItem {
  salespersonId: string | null
  salespersonName: string
  revenue: number
  projectCount: number
}

export interface DashboardFilterState {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

interface RevenueBySalesTeamChartProps {
  /** When provided (e.g. Sales view), chart fetches from sales-team-performance API with same filters as Pipeline by Sales Team Member */
  dashboardFilter?: DashboardFilterState | null
  availableFYs?: string[]
  /** When not using dashboardFilter (e.g. Management view), use this data from parent */
  data?: RevenueBySalesTeamItem[]
}

const COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

const RevenueBySalesTeamChart = ({ dashboardFilter, availableFYs = [], data: dataProp = [] }: RevenueBySalesTeamChartProps) => {
  const { user } = useAuth()
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES || user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE

  const effectiveFYs = dashboardFilter?.selectedFYs ?? []
  const effectiveQuarters = dashboardFilter?.selectedQuarters ?? []
  const effectiveMonths = dashboardFilter?.selectedMonths ?? []

  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ['salesTeamPerformance', 'revenue', effectiveFYs, effectiveMonths, effectiveQuarters],
    queryFn: async () => {
      const params = new URLSearchParams()
      effectiveFYs.forEach((fy) => params.append('fy', fy))
      effectiveQuarters.forEach((q) => params.append('quarter', q))
      effectiveMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/sales-team-performance?${params.toString()}`)
      return res.data
    },
    enabled: canView && !!dashboardFilter,
    staleTime: 30000,
  })

  const chartData = dashboardFilter ? (fetchedData?.revenueBySalesperson ?? []) : dataProp

  if (!canView) return null

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm min-h-[360px]">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Revenue by Sales Team Member
          </h2>
        </div>
      </div>
      {/* Fixed height so chart size does not change with empty/loading data */}
      <div className="w-full overflow-x-auto flex flex-col" style={{ height: '320px' }}>
        {dashboardFilter && isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="mt-4 text-sm text-gray-500">Loading chart data...</p>
            </div>
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center px-4">
              <p className="mb-2 text-sm sm:text-base text-gray-500">No data for selected period</p>
              <p className="text-xs sm:text-sm text-gray-600">Revenue data will appear when confirmed/completed projects exist.</p>
            </div>
          </div>
        ) : (
          <div className="min-w-[280px] w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="4%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="salespersonName"
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
                      const d = payload[0].payload as RevenueBySalesTeamItem
                      return (
                        <div className="bg-gradient-to-br from-white to-primary-50 p-4 border-2 border-primary-200 rounded-xl shadow-2xl backdrop-blur-sm">
                          <p className="font-semibold text-gray-900 mb-2">{d.salespersonName}</p>
                          <p className="text-sm text-emerald-600">
                            Revenue: <span className="font-medium">{formatCurrency(d.revenue)}</span>
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
                <Bar dataKey="revenue" name="Revenue (₹)" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

export default RevenueBySalesTeamChart
