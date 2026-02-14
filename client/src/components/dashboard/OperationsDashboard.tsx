import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import QuickAccessSection from './QuickAccessSection'
import { FaCog, FaFileInvoice, FaCheckCircle } from 'react-icons/fa'
import { ProjectStatus } from '../../types'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProjectsByStageChart from './ProjectsByStageChart'
import RevenueBySalesTeamChart from './RevenueBySalesTeamChart'
import MetricCard from './MetricCard'

interface OperationsDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

const OperationsDashboard = ({ selectedFYs, selectedQuarters, selectedMonths }: OperationsDashboardProps) => {
  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data, isLoading } = useQuery({
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
    <div className="space-y-6 animate-fade-in min-w-0 max-w-full mobile-paint-fix">
      {/* Quick Access – tiles linking to filtered Projects */}
      <QuickAccessSection>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        <MetricCard
          title="Pending Installation"
          value={data?.pendingInstallation || 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-indigo-600"
          to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION, ProjectStatus.CONFIRMED] }, tileParams)}
        />
        <MetricCard
          title="Completed Installation"
          value={data?.completedInstallation ?? 0}
          icon={<FaFileInvoice />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED, ProjectStatus.COMPLETED] }, tileParams)}
        />
        <MetricCard
          title="Subsidy Credited"
          value={data?.subsidyCredited || 0}
          icon={<FaCheckCircle />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, tileParams)}
        />
        {/* Payment Status tile */}
        <div className="min-w-0 flex flex-col bg-gradient-to-br from-white via-indigo-50/50 to-white shadow-lg rounded-xl border-2 border-indigo-200/50 overflow-hidden backdrop-blur-sm">
          <div className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5">
            <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-md truncate">
              Payment Status
            </h3>
          </div>
          <div className="px-3 py-2 sm:px-4 sm:py-3 overflow-x-hidden">
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
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(item.status)}`}
                    >
                      {statusLabel}
                    </span>
                    <span
                      className="text-xs sm:text-sm font-semibold text-gray-900 truncate text-right"
                      title={`${item.count} (₹${(item.outstanding ?? 0).toLocaleString('en-IN')})`}
                    >
                      {item.count}{' '}
                      <span className="text-primary-600">(₹{(item.outstanding ?? 0).toLocaleString('en-IN')})</span>
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
          <ProjectsByStageChart data={data?.projectsByStatus || []} />
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
          />
        </div>
      </div>
    </div>
  )
}

export default OperationsDashboard
