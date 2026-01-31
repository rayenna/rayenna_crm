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

      {/* Other tiles + Projects by Payment Status (compact) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-5">
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
        {/* Projects by Payment Status – compact tile for Management/Admin */}
        <div className="min-w-0 bg-gradient-to-br from-white via-indigo-50/50 to-white shadow-lg rounded-xl border-2 border-indigo-200/50 overflow-hidden backdrop-blur-sm">
          <div className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5">
            <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-md truncate">
              Payment Status
            </h3>
          </div>
          <div className="px-3 py-2 sm:px-4 sm:py-3 overflow-x-hidden">
            <div className="space-y-1.5 sm:space-y-2">
              {data?.projectsByPaymentStatus?.map((item: any) => {
                const statusLabel = item.status === 'N/A' ? 'N/A' : item.status.replace(/_/g, ' ');
                const getStatusColor = (status: string) => {
                  if (status === 'N/A') return 'bg-red-100 text-red-800';
                  if (status === 'FULLY_PAID') return 'bg-green-100 text-green-800';
                  if (status === 'PARTIAL') return 'bg-yellow-100 text-yellow-800';
                  return 'bg-red-100 text-red-800';
                };
                return (
                  <div key={item.status} className="flex justify-between items-center gap-2 py-1.5 px-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors min-w-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(item.status)}`}>
                      {statusLabel}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate text-right" title={`${item.count} (₹${(item.outstanding ?? 0).toLocaleString('en-IN')})`}>
                      {item.count} <span className="text-primary-600">(₹{(item.outstanding ?? 0).toLocaleString('en-IN')})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Three main charts – same height, compact, symmetrical (a, b, c) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col">
          <RevenueByLeadSourceChart 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col">
          <SalesTeamTreemap 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col">
          <ProjectValueProfitByFYChart 
            data={data?.projectValueProfitByFY || []} 
            dashboardType="management"
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
            dashboardType="management"
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

export default ManagementDashboard
