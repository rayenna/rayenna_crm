import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProjectValuePieChart from './ProjectValuePieChart'

const FinanceDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'finance'],
    queryFn: async () => {
      const res = await axios.get('/api/dashboard/finance')
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              ₹{data?.totalProjectValue?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-sm text-gray-500">Total Project Value</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-primary-600">
              ₹{data?.totalAmountReceived?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-sm text-gray-500">Amount Received</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-red-500">
              ₹{data?.totalOutstanding?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-sm text-gray-500">Outstanding Balance</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Projects by Payment Status
          </h3>
          <div className="space-y-2">
            {data?.projectsByPaymentStatus?.map((item: any) => (
              <div key={item.status} className="flex justify-between">
                <span className="text-sm text-gray-600">{item.status}</span>
                <span className="text-sm font-medium text-gray-900">
                  {item.count} (₹{item.outstanding?.toLocaleString('en-IN') || 0})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Value by Segment Pie Chart */}
      {data?.projectValueByType && data.projectValueByType.length > 0 && (
        <ProjectValuePieChart data={data.projectValueByType} />
      )}
    </div>
  )
}

export default FinanceDashboard
