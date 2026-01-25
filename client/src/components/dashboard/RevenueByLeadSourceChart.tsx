import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'

interface RevenueByLeadSourceData {
  leadSource: string
  leadSourceLabel: string
  revenue: number
  projectCount: number
}

interface RevenueByLeadSourceChartProps {
  availableFYs?: string[] // Available FYs for filter dropdown
}

const RevenueByLeadSourceChart = ({ availableFYs = [] }: RevenueByLeadSourceChartProps) => {
  const { user } = useAuth()
  const [selectedFY, setSelectedFY] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  // Role-based access: Only show for ADMIN, MANAGEMENT, SALES
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES

  // Fetch chart data independently based on chart's own filters
  const { data, isLoading } = useQuery({
    queryKey: ['revenueByLeadSource', selectedFY, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedFY !== 'all') {
        params.append('fy', selectedFY)
      }
      if (selectedMonth !== 'all') {
        params.append('month', selectedMonth)
      }
      const res = await axiosInstance.get(`/api/dashboard/revenue-by-lead-source?${params.toString()}`)
      return res.data
    },
    enabled: canView, // Only fetch if user has access
    staleTime: 30000, // Cache for 30 seconds
  })

  // Don't render if user doesn't have access
  if (!canView) {
    return null
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-center h-64 sm:h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading chart data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state if no data
  if (!data?.revenueByLeadSource || data.revenueByLeadSource.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Revenue by Lead Source
          </h2>
        </div>
        <div className="flex items-center justify-center h-64 sm:h-96 text-gray-500">
          <div className="text-center px-4">
            <p className="mb-2 text-sm sm:text-base">No data for selected period</p>
            <p className="text-xs sm:text-sm text-gray-600">Revenue data will appear here when projects are confirmed and completed.</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-4 italic">
          Actual revenue generated from confirmed and completed projects
        </p>
      </div>
    )
  }

  const chartData = data.revenueByLeadSource as RevenueByLeadSourceData[]

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`
  }

  // Color palette for stacked bars (using gradient colors)
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ]

  return (
    <div className="bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Revenue by Lead Source
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="fy-filter-revenue" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by FY:
          </label>
          <select
            id="fy-filter-revenue"
            className="border-2 border-primary-300 rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-white to-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto sm:min-w-[150px] shadow-md hover:shadow-lg transition-all duration-200"
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
          >
            <option value="all">All Financial Years</option>
            {availableFYs.map((fy: string) => (
              <option key={fy} value={fy}>
                {fy}
              </option>
            ))}
          </select>
          <label htmlFor="month-filter-revenue" className="text-sm font-medium text-gray-700 whitespace-nowrap sm:ml-4">
            Filter by Month:
          </label>
          <select
            id="month-filter-revenue"
            className="border-2 border-primary-300 rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-white to-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto sm:min-w-[150px] shadow-md hover:shadow-lg transition-all duration-200"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[300px]" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60, // Extra space for rotated labels
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="leadSourceLabel" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={{ value: 'Lead Source', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
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
                    const data = payload[0].payload as RevenueByLeadSourceData
                    return (
                      <div className="bg-gradient-to-br from-white to-primary-50 p-4 border-2 border-primary-200 rounded-xl shadow-2xl backdrop-blur-sm">
                        <p className="font-semibold text-gray-900 mb-2">
                          {data.leadSourceLabel}
                        </p>
                        <p className="text-sm text-purple-600">
                          Total Revenue: <span className="font-medium">{formatCurrency(data.revenue)}</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Projects: <span className="font-medium">{data.projectCount}</span>
                        </p>
                        {selectedFY !== 'all' && (
                          <p className="text-xs text-gray-500 mt-1">FY: {selectedFY}</p>
                        )}
                        {selectedMonth !== 'all' && (
                          <p className="text-xs text-gray-500 mt-1">Month: {selectedMonth}</p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Bar 
                dataKey="revenue" 
                name="Revenue (₹)" 
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center mt-4 italic">
        Actual revenue generated from confirmed and completed projects
      </p>
    </div>
  )
}

export default RevenueByLeadSourceChart
