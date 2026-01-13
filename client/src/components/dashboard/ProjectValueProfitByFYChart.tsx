import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FYData {
  fy: string
  totalProjectValue: number
  totalProfit: number
}

interface ProjectValueProfitByFYChartProps {
  data: FYData[]
}

const ProjectValueProfitByFYChart = ({ data }: ProjectValueProfitByFYChartProps) => {
  const [selectedFY, setSelectedFY] = useState<string>('all')

  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('ProjectValueProfitByFYChart - Data received:', data)
  }
  
  // Normalize data - ensure it's an array
  const chartData = Array.isArray(data) ? data : []

  // Show placeholder if no data
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Total Project Value and Total Profit by Financial Year
        </h2>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <p className="mb-2">No data available.</p>
            <p className="text-sm">Projects with financial year information will appear here.</p>
            <p className="text-xs mt-2 text-gray-400">Data structure: {JSON.stringify(chartData)}</p>
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
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Total Project Value and Total Profit by Financial Year
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="fy-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by FY:
          </label>
          <select
            id="fy-filter"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[150px]"
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
      <div className="w-full" style={{ height: '400px' }}>
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
              label={{ value: selectedFY === 'all' ? 'Financial Year (FY)' : `Financial Year: ${selectedFY}`, position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Value in Indian Rupees (₹)', angle: -90, position: 'insideLeft' }}
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
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
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
              name="Total Project Value" 
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
  )
}

export default ProjectValueProfitByFYChart
