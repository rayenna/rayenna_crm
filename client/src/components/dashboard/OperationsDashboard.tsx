import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaCog, FaFileInvoice, FaCheckCircle } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import MetricCard from './MetricCard'

interface OperationsDashboardProps {
  selectedFYs: string[]
  selectedMonths: string[]
}

const OperationsDashboard = ({ selectedFYs, selectedMonths }: OperationsDashboardProps) => {
  // Fetch dashboard metrics with filters (for metric cards only)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'operations', 'metrics', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/operations?${params.toString()}`)
      return res.data
    },
  })

  // Fetch unfiltered chart data separately (charts have their own filters)
  const { data: chartData } = useQuery({
    queryKey: ['dashboard', 'operations', 'charts'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/dashboard/operations`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Pending Installation"
          value={data?.pendingInstallation || 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-blue-500"
        />
        <MetricCard
          title="Submitted for Subsidy"
          value={data?.submittedForSubsidy || 0}
          icon={<FaFileInvoice />}
          gradient="from-yellow-500 to-amber-500"
        />
        <MetricCard
          title="Subsidy Credited"
          value={data?.subsidyCredited || 0}
          icon={<FaCheckCircle />}
          gradient="from-green-500 to-teal-500"
        />
      </div>

      {data?.pendingSubsidy && data.pendingSubsidy.length > 0 && (
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
            <h3 className="text-lg font-bold text-white">
              Pending Subsidy ({data.pendingSubsidy.length})
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-3">
              {data.pendingSubsidy.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-medium text-gray-700">{item.customerName}</span>
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                    {item.daysPending} days pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      {/* Charts use unfiltered data and have their own independent filters */}
      <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white rounded-2xl shadow-2xl p-6 border-2 border-primary-200/50 backdrop-blur-sm">
        <ProjectValueProfitByFYChart 
          data={chartData?.projectValueProfitByFY || []} 
          dashboardType="operations"
        />
      </div>

      {/* Project Value by Segment Pie Chart */}
      {/* Chart fetches its own data independently based on its own filter */}
      <div className="w-full">
        <ProjectValuePieChart 
          data={chartData?.projectValueByType || []} 
          availableFYs={chartData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []}
          dashboardType="operations"
        />
      </div>
    </div>
  )
}

export default OperationsDashboard
