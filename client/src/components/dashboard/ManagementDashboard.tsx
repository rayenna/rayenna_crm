import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaUsers, FaBolt, FaRupeeSign, FaChartLine, FaCog, FaClock, FaCheckCircle } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import SalesTeamTreemap from './SalesTeamTreemap'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import MetricCard from './MetricCard'

interface ManagementDashboardProps {
  selectedFYs: string[]
  selectedMonths: string[]
}

const ManagementDashboard = ({ selectedFYs, selectedMonths }: ManagementDashboardProps) => {
  // Fetch dashboard metrics with filters (for metric cards only)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'management', 'metrics', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/management?${params.toString()}`)
      return res.data
    },
  })

  // Fetch unfiltered chart data separately (charts have their own filters)
  const { data: chartData } = useQuery({
    queryKey: ['dashboard', 'management', 'charts'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/dashboard/management`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  // Debug: Log data to console (can be removed in production)
  if (import.meta.env.DEV) {
    console.log('Management Dashboard Data (Metrics):', data)
    console.log('Management Dashboard Data (Charts):', chartData)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Total Leads"
          value={data?.sales?.totalLeads || 0}
          icon={<FaUsers />}
          gradient="from-blue-500 to-cyan-500"
        />
        <MetricCard
          title="Total Capacity"
          value={`${Math.round(data?.sales?.totalCapacity || 0)} kW`}
          icon={<FaBolt />}
          gradient="from-yellow-500 to-orange-500"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${Math.round(data?.finance?.totalValue || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-primary-600 to-primary-700"
        />
        <MetricCard
          title="Total Pipeline"
          value={`₹${Math.round(data?.totalPipeline || 0).toLocaleString('en-IN')}`}
          icon={<FaChartLine />}
          gradient="from-indigo-500 to-purple-500"
        />
        <MetricCard
          title="Total Profit"
          value={`₹${Math.round(data?.finance?.totalProfit || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Pending Installation"
          value={data?.operations?.pendingInstallation || 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-blue-500"
        />
        <MetricCard
          title="Pending Subsidy"
          value={data?.operations?.pendingSubsidy || 0}
          icon={<FaClock />}
          gradient="from-yellow-500 to-amber-500"
        />
        <MetricCard
          title="Subsidy Credited"
          value={data?.operations?.subsidyCredited || 0}
          icon={<FaCheckCircle />}
          gradient="from-yellow-500 to-amber-500"
        />
      </div>

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      {/* Charts use unfiltered data and have their own independent filters */}
      <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white rounded-2xl shadow-2xl p-6 border-2 border-primary-200/50 backdrop-blur-sm">
        <ProjectValueProfitByFYChart 
          data={chartData?.projectValueProfitByFY || []} 
          dashboardType="management"
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
            dashboardType="management"
          />
        </div>
        {/* Customer Profitability Word Cloud */}
        <div className="w-full">
          <ProfitabilityWordCloud 
            availableFYs={chartData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []} 
          />
        </div>
      </div>

      {/* Sales Team Performance Treemap */}
      <div className="w-full">
        <SalesTeamTreemap 
          availableFYs={chartData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []} 
        />
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

export default ManagementDashboard
