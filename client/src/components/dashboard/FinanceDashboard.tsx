import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaRupeeSign, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import MetricCard from './MetricCard'

interface FinanceDashboardProps {
  selectedFYs: string[]
  selectedMonths: string[]
}

const FinanceDashboard = ({ selectedFYs, selectedMonths }: FinanceDashboardProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'finance', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/finance?${params.toString()}`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Total Revenue"
          value={`₹${Math.round(data?.totalProjectValue || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-green-500 to-emerald-500"
        />
        <MetricCard
          title="Amount Received"
          value={`₹${(data?.totalAmountReceived || 0).toLocaleString('en-IN')}`}
          icon={<FaCheckCircle />}
          gradient="from-blue-500 to-cyan-500"
        />
        <MetricCard
          title="Outstanding Balance"
          value={`₹${(data?.totalOutstanding || 0).toLocaleString('en-IN')}`}
          icon={<FaExclamationCircle />}
          gradient="from-red-500 to-rose-500"
        />
      </div>

      <div className="bg-gradient-to-br from-white via-blue-50/50 to-white shadow-2xl rounded-2xl border-2 border-blue-200/50 overflow-hidden backdrop-blur-sm">
        <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 px-6 py-4 shadow-lg">
          <h3 className="text-lg font-bold text-white drop-shadow-md">
            Projects by Payment Status
          </h3>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-3">
            {data?.projectsByPaymentStatus?.map((item: any) => (
              <div key={item.status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-sm font-medium text-gray-700">{item.status}</span>
                <span className="text-sm font-bold text-gray-900">
                  {item.count} <span className="text-primary-600">(₹{item.outstanding?.toLocaleString('en-IN') || 0})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <ProjectValueProfitByFYChart data={data?.projectValueProfitByFY || []} />
      </div>
    </div>
  )
}

export default FinanceDashboard
