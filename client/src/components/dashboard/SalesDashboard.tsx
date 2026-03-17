import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { FaUsers, FaCheckCircle, FaClipboardList, FaExclamationTriangle } from 'react-icons/fa'
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

      {/* Quick Access – tiles linking to filtered Projects */}
      <QuickAccessSection>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="My Leads"
          value={data?.leads?.total || 0}
          icon={<FaUsers />}
          gradient="from-indigo-500 to-cyan-500"
          to={buildProjectsUrl({ status: [ProjectStatus.LEAD] }, tileParams)}
        />
        <MetricCard
          title="Site Survey Stage"
          value={data?.pipeline?.survey || 0}
          icon={<FaClipboardList />}
          gradient="from-indigo-500 to-indigo-600"
          to={buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, tileParams)}
        />
        <MetricCard
          title="Proposal Stage"
          value={data?.pipeline?.proposal || 0}
          icon={<FaClipboardList />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, tileParams)}
        />
        <MetricCard
          title="My Open Deals"
          value={data?.pipeline?.atRisk || 0}
          icon={<FaExclamationTriangle />}
          gradient="from-red-500 to-rose-500"
          to={buildProjectsUrl({ status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] }, tileParams)}
        />
        <MetricCard
          title="My Confirmed Orders"
          value={data?.pipeline?.approved || 0}
          icon={<FaCheckCircle />}
          gradient="from-purple-500 to-pink-500"
          to={buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, tileParams)}
        />
      </div>
      </QuickAccessSection>

      {/* Row 1: Projects by Stage / Execution Status, Revenue & Profit by Financial Year – side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProjectsByStageChart data={data?.projectsByStatus || []} />
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
          <PipelineByLeadSourceChart data={data?.pipelineByLeadSource || []} />
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
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <PipelineByCustomerSegmentPieChart data={data?.pipelineByType || []} />
        </div>
      </div>

      {/* Row 4: Customer Profitability Word Cloud, Availing Loan by Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <Suspense fallback={<div className="w-full min-h-[360px] rounded-2xl border border-primary-200/40 bg-white" />}>
            <ProfitabilityWordCloud 
              wordCloudData={data?.wordCloudData}
              availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
              filterControlledByParent
            />
          </Suspense>
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <AvailingLoanByBankChart data={data?.availingLoanByBank || []} />
        </div>
      </div>
    </div>
  )
}

export default SalesDashboard
