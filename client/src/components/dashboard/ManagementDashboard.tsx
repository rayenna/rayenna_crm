import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { FaUsers, FaCog, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { ProjectStatus } from '../../types'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import SalesTeamTreemap from './SalesTeamTreemap'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import PipelineByLeadSourceChart from './PipelineByLeadSourceChart'
import ProjectsByStageChart from './ProjectsByStageChart'
import RevenueBySalesTeamChart from './RevenueBySalesTeamChart'
import PipelineByCustomerSegmentPieChart from './PipelineByCustomerSegmentPieChart'
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[360px] w-full min-w-0">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600" aria-hidden />
          <p className="mt-4 text-sm font-medium text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const projectValueProfitByFY = data?.projectValueProfitByFY ?? []
  const dashboardFilter = { selectedFYs, selectedQuarters, selectedMonths }
  const tileParams = { selectedFYs, selectedQuarters, selectedMonths }

  return (
    <div className="space-y-6 animate-fade-in min-w-0 max-w-full">
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

      {/* Quick Access – tiles linking to filtered Projects */}
      <h2 className="text-sm font-medium text-gray-500 tracking-wide mb-2">Quick Access</h2>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-5 min-w-0">
        <MetricCard
          title="Total Leads"
          value={data?.sales?.totalLeads || 0}
          icon={<FaUsers />}
          gradient="from-indigo-500 to-cyan-500"
          to={buildProjectsUrl({ status: [ProjectStatus.LEAD] }, tileParams)}
        />
        <MetricCard
          title="Open Deals"
          value={data?.pipeline?.atRisk || 0}
          icon={<FaExclamationTriangle />}
          gradient="from-red-500 to-rose-500"
          to={buildProjectsUrl({ status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] }, tileParams)}
        />
        <MetricCard
          title="Pending Installation"
          value={data?.operations?.pendingInstallation || 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-indigo-600"
          to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION, ProjectStatus.CONFIRMED] }, tileParams)}
        />
        <MetricCard
          title="Subsidy Credited"
          value={data?.operations?.subsidyCredited || 0}
          icon={<FaCheckCircle />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, tileParams)}
        />
        {/* Projects by Payment Status – compact tile for Management/Admin */}
        <div className="min-w-0 flex flex-col bg-gradient-to-br from-white via-indigo-50/50 to-white shadow-lg rounded-xl border-2 border-indigo-200/50 overflow-hidden backdrop-blur-sm">
          <div className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5">
            <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-md truncate">
              Payment Status
            </h3>
          </div>
          <div className="px-3 py-2 sm:px-4 sm:py-3 overflow-x-hidden">
            <div className="space-y-1.5 sm:space-y-2">
              {data?.projectsByPaymentStatus?.map((item: any) => {
                const statusLabel = item.status === 'N/A' ? 'N/A' : item.status.replace(/_/g, ' ');
                const paymentParam = item.status === 'N/A' ? 'NA' : item.status;
                const getStatusColor = (status: string) => {
                  if (status === 'N/A') return 'bg-red-100 text-red-800';
                  if (status === 'FULLY_PAID') return 'bg-green-100 text-green-800';
                  if (status === 'PARTIAL') return 'bg-yellow-100 text-yellow-800';
                  return 'bg-red-100 text-red-800';
                };
                return (
                  <Link
                    key={item.status}
                    to={buildProjectsUrl({ paymentStatus: [paymentParam] }, tileParams)}
                    className="flex justify-between items-center gap-2 py-1.5 px-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors min-w-0 cursor-pointer no-underline text-inherit"
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(item.status)}`}>
                      {statusLabel}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate text-right" title={`${item.count} (₹${(item.outstanding ?? 0).toLocaleString('en-IN')})`}>
                      {item.count} <span className="text-primary-600">(₹{(item.outstanding ?? 0).toLocaleString('en-IN')})</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Projects by Stage / Execution Status – full width */}
      <div className="w-full min-w-0">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectsByStageChart data={data?.projectsByStatus || []} />
        </div>
      </div>

      {/* Row 1: Revenue by Lead Source, Pipeline by Lead Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <RevenueByLeadSourceChart 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <PipelineByLeadSourceChart data={data?.pipelineByLeadSource || []} />
        </div>
      </div>

      {/* Row 2: Revenue by Sales Team member, Pipeline by Sales Team member */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <RevenueBySalesTeamChart data={data?.revenueBySalesperson || []} />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <SalesTeamTreemap 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
        </div>
      </div>

      {/* Row 3: Revenue by Customer Segment, Pipeline by Customer Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValuePieChart 
            data={data?.projectValueByType || []} 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="management"
            filterControlledByParent
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <PipelineByCustomerSegmentPieChart data={data?.pipelineByType || []} />
        </div>
      </div>

      {/* Row 4: Revenue & Profit by Financial Year, Customer Profitability Word Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValueProfitByFYChart 
            data={data?.projectValueProfitByFY || []} 
            dashboardType="management"
            filterControlledByParent
            selectedFYsFromDashboard={selectedFYs}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
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
