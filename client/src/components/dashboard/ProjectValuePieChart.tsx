import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface ProjectValueByType {
  type: string
  label: string
  value: number
  count: number
  percentage: string
}

interface ProjectValuePieChartProps {
  data: ProjectValueByType[]
}

const CHART_COLORS = ['#ef4444', '#3b82f6', '#10b981'] // Red, Blue, Green

const ProjectValuePieChart = ({ data }: ProjectValuePieChartProps) => {
  const [outerRadius, setOuterRadius] = useState(120)

  useEffect(() => {
    const updateRadius = () => {
      if (window.innerWidth < 640) {
        setOuterRadius(80)
      } else if (window.innerWidth < 1024) {
        setOuterRadius(100)
      } else {
        setOuterRadius(120)
      }
    }
    updateRadius()
    window.addEventListener('resize', updateRadius)
    return () => window.removeEventListener('resize', updateRadius)
  }, [])

  if (!data || data.length === 0) return null

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4 sm:p-6 h-full flex flex-col">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
        Project Value by Customer Segment
      </h2>
      <div className="w-full overflow-x-auto flex-1 flex flex-col" style={{ minHeight: '350px' }}>
        <div className="min-w-[280px] flex-1" style={{ minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => {
                const total = data.reduce((sum: number, item: any) => sum + item.value, 0)
                const percentage = (entry.value / total) * 100
                if (percentage > 10) {
                  return `${entry.percentage}%`
                }
                return ''
              }}
              outerRadius={outerRadius}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry: any, index: number) => (
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
              formatter={(value, entry: any) => (
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
                {data.map((item: any, index: number) => (
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
