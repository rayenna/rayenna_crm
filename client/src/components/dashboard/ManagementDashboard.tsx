import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { FaUsers, FaCog, FaFileInvoice, FaCheckCircle, FaExclamationTriangle, FaClipboardList, FaUniversity } from 'react-icons/fa'
import { ProjectStatus } from '../../types'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import { Suspense, lazy } from 'react'
const ProfitabilityWordCloud = lazy(() => import('./ProfitabilityWordCloud'))
import SalesTeamTreemap from './SalesTeamTreemap'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import PipelineByLeadSourceChart from './PipelineByLeadSourceChart'
import ProjectsByStageChart from './ProjectsByStageChart'
import AvailingLoanByBankChart from './AvailingLoanByBankChart'
import RevenueBySalesTeamChart from './RevenueBySalesTeamChart'
import PipelineByCustomerSegmentPieChart from './PipelineByCustomerSegmentPieChart'
import MetricCard from './MetricCard'
import QuickAccessSection from './QuickAccessSection'
import KeyMetricsTile from './KeyMetricsTile'
import ProposalEngineStatusCard from './ProposalEngineStatusCard'
import DashboardLifecycleBrandReminder from './DashboardLifecycleBrandReminder'
import DashboardLifecycleBrandBarCharts from './DashboardLifecycleBrandBarCharts'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'

interface ManagementDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  /** When filters are empty, parent already fetched this; skip second request */
  initialDataWhenFiltersEmpty?: unknown
  /** Admin-only: same lifecycle brand reminder as Zenith briefing (not shown to Management). */
  showLifecycleBrandReminder?: boolean
}

const ManagementDashboard = ({
  selectedFYs,
  selectedQuarters,
  selectedMonths,
  initialDataWhenFiltersEmpty,
  showLifecycleBrandReminder = false,
}: ManagementDashboardProps) => {
  const filtersEmpty = selectedFYs.length === 0 && selectedQuarters.length === 0 && selectedMonths.length === 0
  const skipFetch = filtersEmpty && initialDataWhenFiltersEmpty != null

  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data: queryData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'management', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/management?${params.toString()}`)
      return res.data
    },
    enabled: !skipFetch,
    initialData: skipFetch ? (initialDataWhenFiltersEmpty as Record<string, unknown>) : undefined,
  })

  const data = skipFetch ? (initialDataWhenFiltersEmpty as Record<string, unknown>) : queryData

  if (isError) {
    return (
      <div className="w-full min-w-0 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 md:p-6 text-amber-800 text-sm sm:text-base break-words">
        <p className="font-medium">Unable to load dashboard</p>
        <p className="mt-2 text-amber-700 leading-snug">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 min-h-[44px] px-4 py-3 sm:py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 active:opacity-90 touch-manipulation"
        >
          Try again
        </button>
      </div>
    )
  }

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
    <div className="space-y-6 min-w-0 max-w-full">
      {showLifecycleBrandReminder ? (
        <DashboardLifecycleBrandReminder
          projects={(data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]}
          tileParams={tileParams}
        />
      ) : null}
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

      {/* Quick Access – Admin/Management: 4+4 metric rows, then Payment | Availing Loan | Proposal Engine */}
      <QuickAccessSection>
        <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
          {/* Row 1 – pipeline funnel (4 tiles); phone 1 col, tablet 2×2, laptop 1×4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-w-0">
            <MetricCard
              title="Total Leads"
              value={data?.sales?.totalLeads || 0}
              icon={<FaUsers />}
              gradient="from-indigo-500 to-cyan-500"
              to={buildProjectsUrl({ status: [ProjectStatus.LEAD] }, tileParams)}
            />
            <MetricCard
              title="Site Survey Stage"
              value={(data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.SITE_SURVEY)?.count) ?? 0}
              icon={<FaClipboardList />}
              gradient="from-indigo-500 to-indigo-600"
              to={buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, tileParams)}
            />
            <MetricCard
              title="Proposal Stage"
              value={(data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.PROPOSAL)?.count) ?? 0}
              icon={<FaClipboardList />}
              gradient="from-yellow-500 to-amber-500"
              to={buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, tileParams)}
            />
            <MetricCard
              title="Open Deals"
              value={data?.pipeline?.atRisk || 0}
              icon={<FaExclamationTriangle />}
              gradient="from-red-500 to-rose-500"
              to={buildProjectsUrl({ status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] }, tileParams)}
            />
          </div>

          {/* Row 2 – execution (4 tiles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-w-0">
            <MetricCard
              title="Confirmed Orders"
              value={(data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.CONFIRMED)?.count) ?? 0}
              icon={<FaCheckCircle />}
              gradient="from-purple-500 to-pink-500"
              to={buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, tileParams)}
            />
            <MetricCard
              title="Under Installation"
              value={data?.operations?.pendingInstallation || 0}
              icon={<FaCog />}
              gradient="from-indigo-500 to-indigo-600"
              to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, tileParams)}
            />
            <MetricCard
              title="Completed Installation"
              value={((data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.COMPLETED)?.count) ?? 0) + ((data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.COMPLETED_SUBSIDY_CREDITED)?.count) ?? 0)}
              icon={<FaFileInvoice />}
              gradient="from-yellow-500 to-amber-500"
              to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED, ProjectStatus.COMPLETED] }, tileParams)}
            />
            <MetricCard
              title="Subsidy Credited"
              value={data?.operations?.subsidyCredited || 0}
              icon={<FaCheckCircle />}
              gradient="from-yellow-500 to-amber-500"
              to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, tileParams)}
            />
          </div>

          {/* Row 3 – Payment & Proposal Engine stretch to same height; Availing Loan stays top-aligned in the middle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0 md:items-stretch">
            <div className="min-w-0 flex flex-col h-full min-h-0">
              <div className="min-w-0 flex flex-col flex-1 h-full min-h-0 bg-gradient-to-br from-white via-indigo-50/50 to-white shadow-lg rounded-xl border-2 border-indigo-200/50 overflow-hidden backdrop-blur-sm">
                <div className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5 shrink-0">
                  <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-md truncate">Payment Status</h3>
                </div>
                <div className="px-3 py-2 sm:px-4 sm:py-3 overflow-x-hidden flex-1 min-h-0 flex flex-col">
                  <div className="space-y-1.5 sm:space-y-2">
                    {data?.projectsByPaymentStatus?.map((item: any) => {
                      const statusLabel = item.status === 'N/A' ? 'N/A' : item.status.replace(/_/g, ' ')
                      const paymentParam = item.status === 'N/A' ? 'NA' : item.status
                      const getStatusColor = (status: string) => {
                        if (status === 'N/A') return 'bg-red-100 text-red-800'
                        if (status === 'FULLY_PAID') return 'bg-green-100 text-green-800'
                        if (status === 'PARTIAL') return 'bg-yellow-100 text-yellow-800'
                        return 'bg-red-100 text-red-800'
                      }
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
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex flex-col md:justify-center md:self-start">
              <MetricCard
                title="Availing Loan"
                value={data?.availingLoanCount ?? 0}
                icon={<FaUniversity />}
                gradient="from-emerald-500 to-teal-600"
                to={buildProjectsUrl({ availingLoan: true }, tileParams)}
              />
            </div>

            <div className="min-w-0 flex flex-col h-full min-h-0">
              <ProposalEngineStatusCard
                selectedFYs={selectedFYs}
                selectedQuarters={selectedQuarters}
                selectedMonths={selectedMonths}
                gridClassName="h-full min-h-0 flex-1"
              />
            </div>
          </div>
        </div>
      </QuickAccessSection>

      {/* Row 1: Projects by Stage / Execution Status, Revenue & Profit by Financial Year – side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectsByStageChart data={data?.projectsByStatus || []} dashboardFilter={dashboardFilter} />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValueProfitByFYChart 
            data={data?.projectValueProfitByFY || []} 
            dashboardType="management"
            filterControlledByParent
            selectedFYsFromDashboard={selectedFYs}
          />
        </div>
      </div>

      {/* Row 2: Revenue by Lead Source, Pipeline by Lead Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <RevenueByLeadSourceChart 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <PipelineByLeadSourceChart data={data?.pipelineByLeadSource || []} dashboardFilter={dashboardFilter} />
        </div>
      </div>

      {/* Row 3: Revenue by Sales Team member, Pipeline by Sales Team member */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <RevenueBySalesTeamChart data={data?.revenueBySalesperson || []} dashboardFilter={dashboardFilter} />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <SalesTeamTreemap 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
        </div>
      </div>

      {/* Row 4: Revenue by Customer Segment, Pipeline by Customer Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValuePieChart 
            data={data?.projectValueByType || []} 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="management"
            filterControlledByParent
            dashboardFilter={dashboardFilter}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <PipelineByCustomerSegmentPieChart data={data?.pipelineByType || []} dashboardFilter={dashboardFilter} />
        </div>
      </div>

      {/* Row 5: Customer Profitability Word Cloud, Availing Loan by Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <Suspense fallback={<div className="w-full min-h-[360px] rounded-2xl border border-slate-200 bg-white shadow-sm" />}>
            <ProfitabilityWordCloud 
              wordCloudData={data?.wordCloudData}
              availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
              filterControlledByParent
              dashboardFilter={dashboardFilter}
            />
          </Suspense>
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <AvailingLoanByBankChart data={data?.availingLoanByBank || []} dashboardFilter={dashboardFilter} />
        </div>
      </div>

      {/* Row 6: Projects by panel / inverter brand (Zenith parity cohort) */}
      <DashboardLifecycleBrandBarCharts
        projects={(data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]}
        tileParams={tileParams}
      />
    </div>
  )
}

export default ManagementDashboard
