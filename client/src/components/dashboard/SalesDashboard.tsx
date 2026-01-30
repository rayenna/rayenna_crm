import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaUsers, FaCheckCircle, FaClipboardList, FaExclamationTriangle } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import MetricCard from './MetricCard'
import KeyMetricsTile from './KeyMetricsTile'

interface SalesDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

const SalesDashboard = ({ selectedFYs, selectedQuarters, selectedMonths }: SalesDashboardProps) => {
  // Fetch dashboard metrics with filters (for metric cards only)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'sales', 'metrics', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/sales?${params.toString()}`)
      return res.data
    },
  })

  // Fetch unfiltered chart data separately (charts have their own filters)
  const { data: chartData } = useQuery({
    queryKey: ['dashboard', 'sales', 'charts'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/dashboard/sales`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  // Debug: Log data to console (can be removed in production)
  if (import.meta.env.DEV) {
    console.log('Sales Dashboard Data (Metrics):', data)
    console.log('Sales Dashboard Data (Charts):', chartData)
  }

  const projectValueProfitByFY = chartData?.projectValueProfitByFY ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Year on Year – full width row */}
      <div className="w-full">
        <KeyMetricsTile
          capacity={data?.revenue?.totalCapacity ?? 0}
          pipeline={data?.totalPipeline ?? 0}
          revenue={data?.revenue?.totalRevenue ?? 0}
          profit={data?.totalProfit ?? 0}
          projectValueProfitByFY={projectValueProfitByFY}
          selectedFYs={selectedFYs}
          previousYearSamePeriod={data?.previousYearSamePeriod ?? undefined}
        />
      </div>

      {/* Other tiles – same width as each other */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Total Leads"
          value={data?.leads?.total || 0}
          icon={<FaUsers />}
          gradient="from-indigo-500 to-cyan-500"
        />
        <MetricCard
          title="Approved Projects"
          value={data?.pipeline?.approved || 0}
          icon={<FaCheckCircle />}
          gradient="from-purple-500 to-pink-500"
        />
        <MetricCard
          title="Survey Stage"
          value={data?.pipeline?.survey || 0}
          icon={<FaClipboardList />}
          gradient="from-indigo-500 to-indigo-600"
        />
        <MetricCard
          title="Proposal Stage"
          value={data?.pipeline?.proposal || 0}
          icon={<FaClipboardList />}
          gradient="from-yellow-500 to-amber-500"
        />
        <MetricCard
          title="At Risk"
          value={data?.pipeline?.atRisk || 0}
          icon={<FaExclamationTriangle />}
          gradient="from-red-500 to-rose-500"
        />
      </div>

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      {/* Charts use unfiltered data and have their own independent filters */}
      <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <ProjectValueProfitByFYChart 
          data={chartData?.projectValueProfitByFY || []} 
          dashboardType="sales"
        />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Project Value by Segment Pie Chart */}
        {/* Chart fetches its own data independently based on its own filter */}
        <div className="w-full">
          <ProjectValuePieChart 
            data={chartData?.projectValueByType || []} 
            availableFYs={chartData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="sales"
          />
        </div>
        {/* Customer Profitability Word Cloud */}
        <div className="w-full">
          <ProfitabilityWordCloud 
            availableFYs={chartData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []} 
          />
        </div>
      </div>

      {/* Revenue by Lead Source Chart */}
      <div className="w-full">
        <RevenueByLeadSourceChart 
          availableFYs={chartData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []}
        />
      </div>
    </div>
  )
}

export default SalesDashboard
