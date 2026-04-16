import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import QuickAccessSection from './QuickAccessSection'
import { FaCog, FaFileInvoice, FaCheckCircle } from 'react-icons/fa'
import { ProjectStatus } from '../../types'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProjectsByStageChart from './ProjectsByStageChart'
import RevenueBySalesTeamChart from './RevenueBySalesTeamChart'
import MetricCard from './MetricCard'
import DashboardLifecycleBrandReminder from './DashboardLifecycleBrandReminder'
import DashboardLifecycleBrandBarCharts from './DashboardLifecycleBrandBarCharts'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'

interface OperationsDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

const OperationsDashboard = ({ selectedFYs, selectedQuarters, selectedMonths }: OperationsDashboardProps) => {
  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'operations', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/operations?${params.toString()}`)
      return res.data
    },
  })

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
      <DashboardLifecycleBrandReminder
        projects={(data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]}
        tileParams={tileParams}
      />
      {/* Quick Access – tiles linking to filtered Projects */}
      <QuickAccessSection variant="zenith">
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        <MetricCard
          title="Pending Installation"
          value={data?.pendingInstallation || 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-indigo-600"
          to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION, ProjectStatus.CONFIRMED] }, tileParams)}
          variant="zenith"
        />
        <MetricCard
          title="Completed Installation"
          value={data?.completedInstallation ?? 0}
          icon={<FaFileInvoice />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED, ProjectStatus.COMPLETED] }, tileParams)}
          variant="zenith"
        />
        <MetricCard
          title="Subsidy Credited"
          value={data?.subsidyCredited || 0}
          icon={<FaCheckCircle />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, tileParams)}
          variant="zenith"
        />
        {/* Payment Status tile */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
          <div className="bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-gold)] to-[color:var(--accent-amber)] px-3 py-2 sm:px-4 sm:py-2.5">
            <h3 className="truncate text-sm font-bold text-[color:var(--text-inverse)] drop-shadow-md sm:text-base">
              Payment Status
            </h3>
          </div>
          <div className="overflow-x-hidden px-3 py-2 sm:px-4 sm:py-3">
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
      </QuickAccessSection>

      {data?.pendingSubsidy && data.pendingSubsidy.length > 0 && (
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 overflow-hidden min-w-0">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="text-base sm:text-lg font-bold text-white truncate">
              Pending Subsidy ({data.pendingSubsidy.length})
            </h3>
          </div>
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="space-y-3">
              {data.pendingSubsidy.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-w-0">
                  <span className="text-sm font-medium text-gray-700 truncate" title={item.customerName}>{item.customerName}</span>
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 sm:px-3 py-1 rounded-full flex-shrink-0">
                    {item.daysPending} days pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Projects by Stage / Execution Status, Revenue by Sales Team Member – 2x2 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectsByStageChart data={data?.projectsByStatus || []} dashboardFilter={dashboardFilter} />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <RevenueBySalesTeamChart
            dashboardFilter={dashboardFilter}
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            data={[]}
          />
        </div>
      </div>

      {/* Row 2: Project Value & Profit by FY, Revenue by Customer Segment (Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValueProfitByFYChart
            data={data?.projectValueProfitByFY || []}
            dashboardType="operations"
            filterControlledByParent
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValuePieChart
            data={data?.projectValueByType || []}
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="operations"
            filterControlledByParent
            dashboardFilter={dashboardFilter}
          />
        </div>
      </div>

      {/* Projects by panel / inverter brand (same cohort as Zenith Operations) */}
      <DashboardLifecycleBrandBarCharts
        projects={(data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]}
        tileParams={tileParams}
      />
    </div>
  )
}

export default OperationsDashboard
