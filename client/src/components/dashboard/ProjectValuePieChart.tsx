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
  if (!data || data.length === 0) return null

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Total Project Value by Customer Segment
      </h2>
      <div className="w-full" style={{ height: '400px' }}>
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
              outerRadius={120}
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
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold text-gray-900">{data.label}</p>
                      <p className="text-sm text-gray-600">
                        Value: <span className="font-medium text-primary-600">₹{data.value.toLocaleString('en-IN')}</span>
                      </p>
                      <p className="text-sm text-gray-600">
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
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {entry.payload.label}: ₹{entry.payload.value.toLocaleString('en-IN')} ({entry.payload.percentage}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer Segment
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project Count
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item: any, index: number) => (
              <tr key={item.type} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                  {item.count}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  ₹{item.value.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-primary-600">
                  {item.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProjectValuePieChart
