import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FYData {
  fy: string
  totalProjectValue: number
  totalProfit: number
}

interface ProjectValueProfitByFYChartProps {
  data?: FYData[] // Optional - chart can fetch its own data
}

const ProjectValueProfitByFYChart = ({ data: initialData }: ProjectValueProfitByFYChartProps) => {
  const [selectedFY, setSelectedFY] = useState<string>('all')

  // Fetch chart data independently based on chart's own filter
  // This ensures the chart filter works independently from dashboard filters
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ['projectValueProfitByFY', selectedFY],
    queryFn: async () => {
      if (selectedFY === 'all') {
        // Fetch all data when 'all' is selected
        const res = await axiosInstance.get(`/api/dashboard/management`)
        return res.data.projectValueProfitByFY || []
      }
      // Fetch filtered data when specific FY is selected
      const res = await axiosInstance.get(`/api/dashboard/management?fy=${selectedFY}`)
      return res.data.projectValueProfitByFY || []
    },
    enabled: true, // Always fetch - chart manages its own data
    staleTime: 30000, // Cache for 30 seconds
  })

  // Use fetched data (chart manages its own filtering)
  // Fallback to initialData only if no data fetched yet (for initial render)
  const chartData = fetchedData || initialData || []

  // Debug logging (can be removed in production)
  if (import.meta.env.DEV) {
    console.log('ProjectValueProfitByFYChart - Initial data:', initialData)
    console.log('ProjectValueProfitByFYChart - Fetched data:', fetchedData)
    console.log('ProjectValueProfitByFYChart - Chart data (filtered):', chartData)
  }

  // Show placeholder if no data
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

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Total Revenue and Total Profit by Financial Year
          </h2>
        </div>
      <div className="flex items-center justify-center h-64 sm:h-96 text-gray-500">
        <div className="text-center px-4">
          <p className="mb-2 text-sm sm:text-base">No data available.</p>
          <p className="text-xs sm:text-sm text-gray-600">Projects with financial year information will appear here.</p>
        </div>
      </div>
      </div>
    )
  }

  // Get unique financial years for the filter dropdown
  const availableFYs = Array.from(new Set(chartData.map((item) => item.fy))).filter(fy => fy).sort()

  // Filter data based on selected financial year
  const filteredData = selectedFY === 'all' 
    ? chartData 
    : chartData.filter((item) => item.fy === selectedFY)

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`
  }

  return (
    <div className="bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Project Value & Profit by Financial Year
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="fy-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by FY:
          </label>
          <select
            id="fy-filter"
            className="border-2 border-primary-300 rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-white to-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto sm:min-w-[150px] shadow-md hover:shadow-lg transition-all duration-200"
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
          >
            <option value="all">All Financial Years</option>
            {availableFYs.map((fy) => (
              <option key={fy} value={fy}>
                {fy}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[300px]" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fy" 
              tick={{ fontSize: 12 }}
              label={{ value: selectedFY === 'all' ? 'Financial Year (FY)' : `FY: ${selectedFY}`, position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Value (₹)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
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
                  return (
                    <div className="bg-gradient-to-br from-white to-primary-50 p-4 border-2 border-primary-200 rounded-xl shadow-2xl backdrop-blur-sm">
                      <p className="font-semibold text-gray-900 mb-2">
                        FY: {payload[0].payload.fy}
                      </p>
                      {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                          {entry.name}: <span className="font-medium">{formatCurrency(entry.value)}</span>
                        </p>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            <Bar 
              dataKey="totalProjectValue" 
              name="Total Revenue" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="totalProfit" 
              name="Total Profit" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ProjectValueProfitByFYChart
