import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaCog, FaFileInvoice, FaCheckCircle } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
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

  return (
    <div className="space-y-6 animate-fade-in min-w-0 max-w-full">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Pending Installation"
          value={data?.pendingInstallation || 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-indigo-600"
        />
        <MetricCard
          title="Submitted for Subsidy"
          value={data?.submittedForSubsidy || 0}
          icon={<FaFileInvoice />}
          gradient="from-yellow-500 to-amber-500"
        />
        <MetricCard
          title="Subsidy Credited"
          value={data?.subsidyCredited || 0}
          icon={<FaCheckCircle />}
          gradient="from-yellow-500 to-amber-500"
        />
      </div>

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
