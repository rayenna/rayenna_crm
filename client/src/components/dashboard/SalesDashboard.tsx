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
  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'sales', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/sales?${params.toString()}`)
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

      {/* Row 1: Revenue by Lead Source and Project Value & Profit by FY – side by side on laptop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch min-w-0">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <RevenueByLeadSourceChart 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValueProfitByFYChart 
            data={data?.projectValueProfitByFY || []} 
            dashboardType="sales"
            filterControlledByParent
          />
        </div>
      </div>

      {/* Row 2: Pie chart and Word cloud – side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="w-full min-h-0">
          <ProjectValuePieChart 
            data={data?.projectValueByType || []} 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="sales"
            filterControlledByParent
          />
        </div>
        <div className="w-full min-h-0">
          <ProfitabilityWordCloud 
            wordCloudData={data?.wordCloudData}
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            filterControlledByParent
          />
        </div>
      </div>
    </div>
  )
}

export default SalesDashboard
