import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'

interface ProjectValueByType {
  type: string
  label: string
  value: number
  count: number
  percentage: string
}

interface ProjectValuePieChartProps {
  data?: ProjectValueByType[] // Optional - chart will fetch its own data if not provided
  availableFYs?: string[] // Available financial years from dashboard
  dashboardType?: 'management' | 'sales' | 'operations' | 'finance' // Dashboard type to determine API endpoint
}

const CHART_COLORS = ['#ef4444', '#3b82f6', '#10b981'] // Red, Blue, Green

const ProjectValuePieChart = ({ data: initialData, availableFYs = [], dashboardType = 'management' }: ProjectValuePieChartProps) => {
  const [outerRadius, setOuterRadius] = useState(120)
  const [chartHeight, setChartHeight] = useState(350)
  const [selectedFY, setSelectedFY] = useState<string>('all')
  
  // Fetch available FYs if not provided
  const { data: fyData } = useQuery({
    queryKey: ['dashboard', dashboardType, 'fys'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/dashboard/${dashboardType}`)
      return res.data
    },
    enabled: availableFYs.length === 0, // Only fetch if availableFYs not provided
    staleTime: 300000, // Cache for 5 minutes
  })

  const finalAvailableFYs = availableFYs.length > 0 
    ? availableFYs 
    : fyData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []

  // Fetch chart data independently based on chart's own filter
  // This ensures the chart filter works independently from dashboard filters
  const { data: filteredData, isLoading: isLoadingFiltered } = useQuery({
    queryKey: ['projectValueByType', dashboardType, selectedFY],
    queryFn: async () => {
      if (selectedFY === 'all') {
        // Fetch all data when 'all' is selected
        const endpoint = `/api/dashboard/${dashboardType}`
        const res = await axiosInstance.get(endpoint)
        return res.data.projectValueByType || []
      }
      // Fetch filtered data when specific FY is selected
      const endpoint = `/api/dashboard/${dashboardType}?fy=${selectedFY}`
      const res = await axiosInstance.get(endpoint)
      return res.data.projectValueByType || []
    },
    enabled: true, // Always fetch - chart manages its own data
    staleTime: 30000, // Cache for 30 seconds
  })
  
  // Use fetched data (chart manages its own filtering)
  // Fallback to initialData only if no data fetched yet (for initial render)
  const chartData = filteredData || initialData || []

  useEffect(() => {
    const updateRadius = () => {
      if (window.innerWidth < 640) {
        setOuterRadius(80)
        setChartHeight(280)
      } else if (window.innerWidth < 1024) {
        setOuterRadius(100)
        setChartHeight(320)
      } else {
        setOuterRadius(120)
        setChartHeight(350)
      }
    }
    updateRadius()
    window.addEventListener('resize', updateRadius)
    return () => window.removeEventListener('resize', updateRadius)
  }, [])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white shadow-xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-6 flex flex-col backdrop-blur-sm min-h-[600px] lg:min-h-[650px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Project Value by Customer Segment
          </h2>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No project data available</p>
        </div>
      </div>
    )
  }

  if (import.meta.env.DEV) {
    console.log('ProjectValuePieChart - Initial data:', initialData)
    console.log('ProjectValuePieChart - Chart data (filtered):', chartData)
  }

  // Use chart data (already filtered by chart's own filter)
  const displayData = chartData

  return (
    <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-6 flex flex-col backdrop-blur-sm min-h-[600px] lg:min-h-[650px]">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Project Value by Customer Segment
          </h2>
        </div>
        {finalAvailableFYs && finalAvailableFYs.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="pie-fy-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Filter by FY:
            </label>
            <select
              id="pie-fy-filter"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto sm:min-w-[150px]"
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              disabled={isLoadingFiltered}
            >
              <option value="all">All Financial Years</option>
              {finalAvailableFYs.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
            {isLoadingFiltered && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
          </div>
        )}
      </div>
      <div className="w-full overflow-x-auto flex-1 flex flex-col">
        <div className="min-w-[280px] w-full" style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => {
                const total = displayData.reduce((sum: number, item: any) => sum + item.value, 0)
                const percentage = total > 0 ? (entry.value / total) * 100 : 0
                if (percentage > 10) {
                  return `${entry.percentage}%`
                }
                return ''
              }}
              outerRadius={outerRadius}
              fill="#8884d8"
              dataKey="value"
            >
              {displayData.map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
                        Value: <span className="font-medium text-primary-600">₹{data.value.toLocaleString('en-IN')}</span>
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
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(_value, entry: any) => (
                <span className="text-xs sm:text-sm">
                  {entry.payload.label}: ₹{entry.payload.value.toLocaleString('en-IN')} ({entry.payload.percentage}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="mt-4 sm:mt-6 overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Segment
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.map((item: any, index: number) => (
                  <tr key={item.type} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        ></div>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.label}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      ₹{item.value.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-primary-600">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectValuePieChart
