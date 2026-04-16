import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { FaUsers, FaCheckCircle, FaClipboardList, FaExclamationTriangle, FaCog, FaFileInvoice } from 'react-icons/fa'
import { ProjectStatus } from '../../types'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import { Suspense, lazy } from 'react'
const ProfitabilityWordCloud = lazy(() => import('./ProfitabilityWordCloud'))
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import PipelineByLeadSourceChart from './PipelineByLeadSourceChart'
import ProjectsByStageChart from './ProjectsByStageChart'
import AvailingLoanByBankChart from './AvailingLoanByBankChart'
import PipelineByCustomerSegmentPieChart from './PipelineByCustomerSegmentPieChart'
import MetricCard from './MetricCard'
import QuickAccessSection from './QuickAccessSection'
import KeyMetricsTile from './KeyMetricsTile'
import ProposalEngineStatusCard from './ProposalEngineStatusCard'
import DashboardLifecycleBrandReminder from './DashboardLifecycleBrandReminder'
import DashboardLifecycleBrandBarCharts from './DashboardLifecycleBrandBarCharts'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'

interface SalesDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  /** When filters are empty, parent already fetched this; skip second request */
  initialDataWhenFiltersEmpty?: unknown
}

const SalesDashboard = ({ selectedFYs, selectedQuarters, selectedMonths, initialDataWhenFiltersEmpty }: SalesDashboardProps) => {
  const filtersEmpty = selectedFYs.length === 0 && selectedQuarters.length === 0 && selectedMonths.length === 0
  const skipFetch = filtersEmpty && initialDataWhenFiltersEmpty != null

  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data: queryData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'sales', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/sales?${params.toString()}`)
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
  const projectsByStatus = data?.projectsByStatus ?? []
  // "Under Installation" should represent Installation stage only.
  const underInstallationCount = projectsByStatus.find((p: any) => p.status === ProjectStatus.UNDER_INSTALLATION)?.count ?? 0
  const completedInstallationCount =
    (projectsByStatus.find((p: any) => p.status === ProjectStatus.COMPLETED)?.count ?? 0) +
    (projectsByStatus.find((p: any) => p.status === ProjectStatus.COMPLETED_SUBSIDY_CREDITED)?.count ?? 0)

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <DashboardLifecycleBrandReminder
        projects={(data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]}
        tileParams={tileParams}
      />
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
          variant="zenith"
        />
      </div>

      {/* Quick Access – 3×3 grid: equal column width on lg; row 3 Payment & PE match height */}
      <QuickAccessSection variant="zenith">
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 min-w-0 lg:items-stretch">
          {/* Row 1 */}
          <MetricCard
            title="My Leads"
            value={data?.leads?.total || 0}
            icon={<FaUsers />}
            gradient="from-indigo-500 to-cyan-500"
            to={buildProjectsUrl({ status: [ProjectStatus.LEAD] }, tileParams)}
            variant="zenith"
          />
          <MetricCard
            title="Site Survey Stage"
            value={data?.pipeline?.survey || 0}
            icon={<FaClipboardList />}
            gradient="from-indigo-500 to-indigo-600"
            to={buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, tileParams)}
            variant="zenith"
          />
          <MetricCard
            title="Proposal Stage"
            value={data?.pipeline?.proposal || 0}
            icon={<FaClipboardList />}
            gradient="from-yellow-500 to-amber-500"
            to={buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, tileParams)}
            variant="zenith"
          />

          {/* Row 2 */}
          <MetricCard
            title="Open Deals"
            value={data?.pipeline?.atRisk || 0}
            icon={<FaExclamationTriangle />}
            gradient="from-red-500 to-rose-500"
            to={buildProjectsUrl({ status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] }, tileParams)}
            variant="zenith"
          />
          <MetricCard
            title="My Confirmed Orders"
            value={data?.pipeline?.approved || 0}
            icon={<FaCheckCircle />}
            gradient="from-purple-500 to-pink-500"
            to={buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, tileParams)}
            variant="zenith"
          />
          <MetricCard
            title="Under Installation"
            value={underInstallationCount}
            icon={<FaCog />}
            gradient="from-indigo-500 to-indigo-600"
            to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, tileParams)}
            variant="zenith"
          />

          {/* Row 3 */}
          <div className="flex h-full min-h-0 min-w-0 flex-col sm:col-span-2 lg:col-span-1">
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
              <div className="shrink-0 bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-gold)] to-[color:var(--accent-amber)] px-3 py-2 sm:px-4 sm:py-2.5">
                <h3 className="truncate text-sm font-bold text-[color:var(--text-inverse)] drop-shadow-md sm:text-base">Payment Status</h3>
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

          <div className="min-w-0 flex flex-col h-full min-h-0 justify-center sm:col-span-2 lg:col-span-1">
            <MetricCard
              title="Completed Installation"
              value={completedInstallationCount}
              icon={<FaFileInvoice />}
              gradient="from-yellow-500 to-amber-500"
              to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED, ProjectStatus.COMPLETED] }, tileParams)}
              variant="zenith"
            />
          </div>

          <div className="min-w-0 flex flex-col h-full min-h-0 sm:col-span-2 lg:col-span-1">
            <ProposalEngineStatusCard
              selectedFYs={selectedFYs}
              selectedQuarters={selectedQuarters}
              selectedMonths={selectedMonths}
              gridClassName="h-full min-h-0 flex-1"
            />
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
            dashboardType="sales"
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

      {/* Row 3: Revenue by Customer Segment, Pipeline by Customer Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValuePieChart 
            data={data?.projectValueByType || []} 
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="sales"
            filterControlledByParent
            dashboardFilter={dashboardFilter}
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <PipelineByCustomerSegmentPieChart data={data?.pipelineByType || []} dashboardFilter={dashboardFilter} />
        </div>
      </div>

      {/* Row 4: Customer Profitability Word Cloud, Availing Loan by Bank */}
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

      {/* Row 5: Projects by panel / inverter brand (Zenith parity cohort) */}
      <DashboardLifecycleBrandBarCharts
        projects={(data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]}
        tileParams={tileParams}
      />
    </div>
  )
}

export default SalesDashboard
