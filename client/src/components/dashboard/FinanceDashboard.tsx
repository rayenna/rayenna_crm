import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { FaRupeeSign, FaCheckCircle, FaExclamationCircle, FaUniversity, FaCog, FaFileInvoice } from 'react-icons/fa'
import { ProjectStatus } from '../../types'
import ProjectValuePieChart from './ProjectValuePieChart'
import { Suspense, lazy } from 'react'
const ProfitabilityWordCloud = lazy(() => import('./ProfitabilityWordCloud'))
import AvailingLoanByBankChart from './AvailingLoanByBankChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import RevenueBySalesTeamChart from './RevenueBySalesTeamChart'
import MetricCard from './MetricCard'
import QuickAccessSection from './QuickAccessSection'
import { ZENITH_DASHBOARD_ANALYTICS_CARD } from './zenithRechartsTooltipStyles'

interface FinanceDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

const FinanceDashboard = ({ selectedFYs, selectedQuarters, selectedMonths }: FinanceDashboardProps) => {
  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'finance', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/finance?${params.toString()}`)
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Total Revenue"
          value={`₹${Math.round(data?.totalProjectValue || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-primary-600 to-primary-700"
          variant="zenith"
        />
        <MetricCard
          title="Amount Received"
          value={`₹${(data?.totalAmountReceived || 0).toLocaleString('en-IN')}`}
          icon={<FaCheckCircle />}
          gradient="from-indigo-500 to-cyan-500"
          variant="zenith"
        />
        <MetricCard
          title="Outstanding Balance"
          value={`₹${(data?.totalOutstanding || 0).toLocaleString('en-IN')}`}
          icon={<FaExclamationCircle />}
          gradient="from-red-500 to-rose-500"
          variant="zenith"
        />
      </div>

      {/* Quick Access – one row: Pending Installation, Completed Installation, Subsidy Credited, Availing Loan, Payment Status */}
      <QuickAccessSection variant="zenith">
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 min-w-0">
        <MetricCard
          title="Pending Installation"
          value={data?.operations?.pendingInstallation ?? 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-indigo-600"
          to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION, ProjectStatus.CONFIRMED] }, tileParams)}
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
          value={data?.operations?.subsidyCredited ?? 0}
          icon={<FaCheckCircle />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, tileParams)}
          variant="zenith"
        />
        <MetricCard
          title="Availing Loan"
          value={data?.availingLoanCount ?? 0}
          icon={<FaUniversity />}
          gradient="from-emerald-500 to-teal-600"
          to={buildProjectsUrl({ availingLoan: true }, tileParams)}
          variant="zenith"
        />
        <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
          <div className="bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-gold)] to-[color:var(--accent-amber)] px-3 py-2 sm:px-4 sm:py-2.5">
            <h3 className="truncate text-sm font-bold text-[color:var(--text-inverse)] drop-shadow-md sm:text-base">Payment Status</h3>
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

      {/* Row 1: Revenue by Lead Source, Revenue by Sales Team Member – 2x2 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <RevenueByLeadSourceChart
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardFilter={dashboardFilter}
          />
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
            dashboardType="finance"
            filterControlledByParent
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectValuePieChart
            data={data?.projectValueByType || []}
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            dashboardType="finance"
            filterControlledByParent
            dashboardFilter={dashboardFilter}
          />
        </div>
      </div>

      {/* Row 3: Customer Profitability Word Cloud, Availing Loan by Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <Suspense fallback={<div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} w-full`} />}>
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
    </div>
  )
}

export default FinanceDashboard
