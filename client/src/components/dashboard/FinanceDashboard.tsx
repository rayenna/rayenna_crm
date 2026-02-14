import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { FaRupeeSign, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import RevenueByLeadSourceChart from './RevenueByLeadSourceChart'
import RevenueBySalesTeamChart from './RevenueBySalesTeamChart'
import MetricCard from './MetricCard'
import QuickAccessSection from './QuickAccessSection'

interface FinanceDashboardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

const FinanceDashboard = ({ selectedFYs, selectedQuarters, selectedMonths }: FinanceDashboardProps) => {
  // Single filtered query for tiles and all charts (same FY, Qtr, Month as dashboard filter)
  const { data, isLoading } = useQuery({
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Total Revenue"
          value={`₹${Math.round(data?.totalProjectValue || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-primary-600 to-primary-700"
        />
        <MetricCard
          title="Amount Received"
          value={`₹${(data?.totalAmountReceived || 0).toLocaleString('en-IN')}`}
          icon={<FaCheckCircle />}
          gradient="from-indigo-500 to-cyan-500"
        />
        <MetricCard
          title="Outstanding Balance"
          value={`₹${(data?.totalOutstanding || 0).toLocaleString('en-IN')}`}
          icon={<FaExclamationCircle />}
          gradient="from-red-500 to-rose-500"
        />
      </div>

      {/* Quick Access – tiles linking to filtered Projects */}
      <QuickAccessSection>
      <div className="bg-gradient-to-br from-white via-indigo-50/50 to-white shadow-xl rounded-xl border-2 border-indigo-200/50 overflow-hidden backdrop-blur-sm min-w-0">
        <div className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600 px-4 py-3 sm:px-6 sm:py-4 shadow-lg">
          <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-md truncate">
            Projects by Payment Status
          </h3>
        </div>
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="space-y-3">
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
                  className="flex justify-between items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-w-0 cursor-pointer no-underline text-inherit"
                >
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(item.status)}`}>
                    {statusLabel}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 truncate text-right" title={`${item.count} (₹${item.outstanding?.toLocaleString('en-IN') || 0})`}>
                    {item.count} <span className="text-primary-600">(₹{item.outstanding?.toLocaleString('en-IN') || 0})</span>
                  </span>
                </Link>
              );
            })}
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
          />
        </div>
      </div>
    </div>
  )
}

export default FinanceDashboard
