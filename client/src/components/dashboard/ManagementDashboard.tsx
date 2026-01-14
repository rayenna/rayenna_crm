import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { FaUsers, FaBolt, FaRupeeSign, FaChartLine, FaCog, FaClock, FaCheckCircle } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import SalesTeamTreemap from './SalesTeamTreemap'
import MetricCard from './MetricCard'

interface ManagementDashboardProps {
  selectedFYs: string[]
  selectedMonths: string[]
}

const ManagementDashboard = ({ selectedFYs, selectedMonths }: ManagementDashboardProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'management', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axios.get(`/api/dashboard/management?${params.toString()}`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  // Debug: Log data to console (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Management Dashboard Data:', data)
    console.log('Project Value Profit By FY:', data?.projectValueProfitByFY)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={data?.sales?.totalLeads || 0}
          icon={<FaUsers />}
          gradient="from-blue-500 to-cyan-500"
        />
        <MetricCard
          title="Total Capacity"
          value={`${(data?.sales?.totalCapacity || 0).toFixed(2)} kW`}
          icon={<FaBolt />}
          gradient="from-yellow-500 to-orange-500"
        />
        <MetricCard
          title="Total Project Value"
          value={`₹${(data?.finance?.totalValue || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-green-500 to-emerald-500"
        />
        <MetricCard
          title="Total Profit"
          value={`₹${(data?.finance?.totalProfit || 0).toLocaleString('en-IN')}`}
          icon={<FaChartLine />}
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
          gradient="from-green-500 to-teal-500"
        />
      </div>

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white rounded-2xl shadow-2xl p-6 border-2 border-primary-200/50 backdrop-blur-sm">
        <ProjectValueProfitByFYChart data={data?.projectValueProfitByFY || []} />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 gap-6 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Project Value by Segment Pie Chart */}
        {data?.projectValueByType && data.projectValueByType.length > 0 && (
          <div className="lg:col-span-1 flex">
            <ProjectValuePieChart 
              data={data.projectValueByType} 
              availableFYs={data?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []}
              dashboardType="management"
            />
          </div>
        )}
        {/* Customer Profitability Word Cloud */}
        <div className="lg:col-span-1 flex">
          <ProfitabilityWordCloud 
            availableFYs={data?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []} 
          />
        </div>
      </div>

      {/* Sales Team Performance Treemap */}
      <div className="w-full">
        <SalesTeamTreemap 
          availableFYs={data?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []} 
        />
      </div>
    </div>
  )
}

export default ManagementDashboard
