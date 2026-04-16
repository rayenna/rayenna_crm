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
      <div className="w-full min-w-0 max-w-xl rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-4 text-sm break-words text-[color:var(--text-primary)] sm:p-5 sm:text-base md:p-6">
        <p className="font-medium">Unable to load dashboard</p>
        <p className="mt-2 leading-snug text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 min-h-[44px] touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-4 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] transition-opacity hover:opacity-95 active:opacity-90 sm:py-2.5"
        >
          Try again
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] w-full min-w-0 items-center justify-center">
        <div className="text-center">
          <div
            className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
            aria-hidden
          />
          <p className="mt-4 text-sm font-medium text-[color:var(--text-muted)]">Loading dashboard...</p>
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
          variant="zenith"
        />
      </div>

      {/* Quick Access – Admin/Management: 4+4 metric rows, then Payment | Availing Loan | Proposal Engine */}
      <QuickAccessSection variant="zenith">
        <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
          {/* Row 1 – pipeline funnel (4 tiles); phone 1 col, tablet 2×2, laptop 1×4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-w-0">
            <MetricCard
              title="Total Leads"
              value={data?.sales?.totalLeads || 0}
              icon={<FaUsers />}
              gradient="from-indigo-500 to-cyan-500"
              to={buildProjectsUrl({ status: [ProjectStatus.LEAD] }, tileParams)}
              variant="zenith"
            />
            <MetricCard
              title="Site Survey Stage"
              value={(data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.SITE_SURVEY)?.count) ?? 0}
              icon={<FaClipboardList />}
              gradient="from-indigo-500 to-indigo-600"
              to={buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, tileParams)}
              variant="zenith"
            />
            <MetricCard
              title="Proposal Stage"
              value={(data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.PROPOSAL)?.count) ?? 0}
              icon={<FaClipboardList />}
              gradient="from-yellow-500 to-amber-500"
              to={buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, tileParams)}
              variant="zenith"
            />
            <MetricCard
              title="Open Deals"
              value={data?.pipeline?.atRisk || 0}
              icon={<FaExclamationTriangle />}
              gradient="from-red-500 to-rose-500"
              to={buildProjectsUrl({ status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] }, tileParams)}
              variant="zenith"
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
              variant="zenith"
            />
            <MetricCard
              title="Under Installation"
              value={data?.operations?.pendingInstallation || 0}
              icon={<FaCog />}
              gradient="from-indigo-500 to-indigo-600"
              to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, tileParams)}
              variant="zenith"
            />
            <MetricCard
              title="Completed Installation"
              value={((data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.COMPLETED)?.count) ?? 0) + ((data?.projectsByStatus?.find((p: any) => p.status === ProjectStatus.COMPLETED_SUBSIDY_CREDITED)?.count) ?? 0)}
              icon={<FaFileInvoice />}
              gradient="from-yellow-500 to-amber-500"
              to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED, ProjectStatus.COMPLETED] }, tileParams)}
              variant="zenith"
            />
            <MetricCard
              title="Subsidy Credited"
              value={data?.operations?.subsidyCredited || 0}
              icon={<FaCheckCircle />}
              gradient="from-yellow-500 to-amber-500"
              to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, tileParams)}
              variant="zenith"
            />
          </div>

          {/* Row 3 – Payment & Proposal Engine stretch to same height; Availing Loan stays top-aligned in the middle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0 md:items-stretch">
            <div className="min-w-0 flex flex-col h-full min-h-0">
              <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
                <div className="shrink-0 bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-gold)] to-[color:var(--accent-amber)] px-3 py-2 sm:px-4 sm:py-2.5">
                  <h3 className="truncate text-sm font-bold text-[color:var(--text-inverse)] drop-shadow-md sm:text-base">
                    Payment Status
                  </h3>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden px-3 py-2 sm:px-4 sm:py-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    {data?.projectsByPaymentStatus?.map((item: any) => {
                      const statusLabel = item.status === 'N/A' ? 'N/A' : item.status.replace(/_/g, ' ')
                      const paymentParam = item.status === 'N/A' ? 'NA' : item.status
                      const getStatusColor = (status: string) => {
                        if (status === 'N/A')
                          return 'border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
                        if (status === 'FULLY_PAID')
                          return 'border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                        if (status === 'PARTIAL')
                          return 'border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                        return 'border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
                      }
                      return (
                        <Link
                          key={item.status}
                          to={buildProjectsUrl({ paymentStatus: [paymentParam] }, tileParams)}
                          className="flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2.5 py-2 text-inherit no-underline transition-colors hover:bg-[color:var(--accent-gold-muted)]/40"
                        >
                          <span
                            className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold ${getStatusColor(item.status)}`}
                          >
                            {statusLabel}
                          </span>
                          <span
                            className="truncate text-right text-xs font-extrabold text-[color:var(--text-primary)] sm:text-sm"
                            title={`${item.count} (₹${(item.outstanding ?? 0).toLocaleString('en-IN')})`}
                          >
                            {item.count}{' '}
                            <span className="text-[color:var(--accent-teal)]">
                              (₹{(item.outstanding ?? 0).toLocaleString('en-IN')})
                            </span>
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
                variant="zenith"
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
