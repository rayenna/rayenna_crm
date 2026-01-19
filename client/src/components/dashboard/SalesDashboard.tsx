import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaUsers, FaBolt, FaRupeeSign, FaCheckCircle, FaClipboardList, FaExclamationTriangle, FaChartLine } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import MetricCard from './MetricCard'

interface SalesDashboardProps {
  selectedFYs: string[]
  selectedMonths: string[]
}

const SalesDashboard = ({ selectedFYs, selectedMonths }: SalesDashboardProps) => {
  // Fetch dashboard metrics with filters (for metric cards only)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'sales', 'metrics', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics Row - 5 columns */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Total Leads"
          value={data?.leads?.total || 0}
          icon={<FaUsers />}
          gradient="from-blue-500 to-cyan-500"
        />
        <MetricCard
          title="Total Capacity"
          value={`${Math.round(data?.revenue?.totalCapacity || 0)} kW`}
          icon={<FaBolt />}
          gradient="from-yellow-500 to-orange-500"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${Math.round(data?.revenue?.totalRevenue || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-green-500 to-emerald-500"
        />
        <MetricCard
          title="Total Pipeline"
          value={`₹${Math.round(data?.totalPipeline || 0).toLocaleString('en-IN')}`}
          icon={<FaChartLine />}
          gradient="from-indigo-500 to-purple-500"
        />
        <MetricCard
          title="Approved Projects"
          value={data?.pipeline?.approved || 0}
          icon={<FaCheckCircle />}
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      {/* Second Metrics Row - 3 columns */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Survey Stage"
          value={data?.pipeline?.survey || 0}
          icon={<FaClipboardList />}
          gradient="from-indigo-500 to-blue-500"
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
    </div>
  )
}

export default SalesDashboard
