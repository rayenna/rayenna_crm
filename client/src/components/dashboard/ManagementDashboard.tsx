import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaUsers, FaCog, FaClock, FaCheckCircle } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import SalesTeamTreemap from './SalesTeamTreemap'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import MetricCard from './MetricCard'
import KeyMetricsTile from './KeyMetricsTile'

interface ManagementDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

const ManagementDashboard = ({ selectedFYs, selectedQuarters, selectedMonths }: ManagementDashboardProps) => {
  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'management', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/management?${params.toString()}`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  const projectValueProfitByFY = data?.projectValueProfitByFY ?? []
  const dashboardFilter = { selectedFYs, selectedQuarters, selectedMonths }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Year on Year – full width row */}
      <div className="w-full">
        <KeyMetricsTile
          capacity={data?.sales?.totalCapacity ?? 0}
          pipeline={data?.totalPipeline ?? 0}
          revenue={data?.finance?.totalValue ?? 0}
          profit={data?.finance?.totalProfit ?? 0}
          projectValueProfitByFY={projectValueProfitByFY}
          selectedFYs={selectedFYs}
          previousYearSamePeriod={data?.previousYearSamePeriod ?? undefined}
        />
      </div>

      {/* Other tiles – same width as each other */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={data?.sales?.totalLeads || 0}
          icon={<FaUsers />}
          gradient="from-indigo-500 to-cyan-500"
        />
        <MetricCard
          title="Pending Installation"
          value={data?.operations?.pendingInstallation || 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-indigo-600"
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
      <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white rounded-2xl shadow-2xl p-6 border-2 border-primary-200/50 backdrop-blur-sm">
        <ProjectValueProfitByFYChart 
          data={data?.projectValueProfitByFY || []} 
          dashboardType="management"
          filterControlledByParent
        />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="w-full">
          <ProjectValuePieChart 
            data={data?.projectValueByType || []} 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="management"
            filterControlledByParent
          />
        </div>
        <div className="w-full">
          <ProfitabilityWordCloud 
            wordCloudData={data?.wordCloudData}
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            filterControlledByParent
          />
        </div>
      </div>

      {/* Sales Team Performance Treemap */}
      <div className="w-full">
        <SalesTeamTreemap 
          availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
          dashboardFilter={dashboardFilter}
        />
      </div>

      {/* Revenue by Lead Source Chart */}
      <div className="w-full">
        <RevenueByLeadSourceChart 
          availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
          dashboardFilter={dashboardFilter}
        />
      </div>
    </div>
  )
}

export default ManagementDashboard
