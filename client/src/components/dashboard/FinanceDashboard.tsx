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
  // Fetch dashboard metrics with filters (for metric cards only)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'finance', 'metrics', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/finance?${params.toString()}`)
      return res.data
    },
  })

  // Fetch unfiltered chart data separately (charts have their own filters)
  const { data: chartData } = useQuery({
    queryKey: ['dashboard', 'finance', 'charts'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/dashboard/finance`)
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
            {data?.projectsByPaymentStatus?.map((item: any) => {
              // Format status label
              const statusLabel = item.status === 'N/A' 
                ? 'N/A' 
                : item.status.replace(/_/g, ' ');
              
              // Get color based on status
              const getStatusColor = (status: string) => {
                if (status === 'N/A') return 'bg-red-100 text-red-800';
                if (status === 'FULLY_PAID') return 'bg-green-100 text-green-800';
                if (status === 'PARTIAL') return 'bg-yellow-100 text-yellow-800';
                return 'bg-red-100 text-red-800'; // PENDING
              };
              
              return (
                <div key={item.status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {statusLabel}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.count} <span className="text-primary-600">(₹{item.outstanding?.toLocaleString('en-IN') || 0})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      {/* Charts use unfiltered data and have their own independent filters */}
      <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <ProjectValueProfitByFYChart 
          data={chartData?.projectValueProfitByFY || []} 
          dashboardType="finance"
        />
      </div>
    </div>
  )
}

export default FinanceDashboard
