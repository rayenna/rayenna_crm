import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { FaRupeeSign, FaCheckCircle, FaExclamationCircle, FaUniversity, FaCog, FaFileInvoice } from 'react-icons/fa'
import { ProjectStatus } from '../../types'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import AvailingLoanByBankChart from './AvailingLoanByBankChart'
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

      {/* Quick Access – one row: Pending Installation, Completed Installation, Subsidy Credited, Availing Loan, Payment Status */}
      <QuickAccessSection>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 min-w-0">
        <MetricCard
          title="Pending Installation"
          value={data?.operations?.pendingInstallation ?? 0}
          icon={<FaCog />}
          gradient="from-indigo-500 to-indigo-600"
          to={buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION, ProjectStatus.CONFIRMED] }, tileParams)}
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
          value={data?.operations?.subsidyCredited ?? 0}
          icon={<FaCheckCircle />}
          gradient="from-yellow-500 to-amber-500"
          to={buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, tileParams)}
        />
        <MetricCard
          title="Availing Loan"
          value={data?.availingLoanCount ?? 0}
          icon={<FaUniversity />}
          gradient="from-emerald-500 to-teal-600"
          to={buildProjectsUrl({ availingLoan: true }, tileParams)}
        />
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

      {/* Row 3: Customer Profitability Word Cloud, Availing Loan by Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <ProfitabilityWordCloud
            wordCloudData={data?.wordCloudData}
            availableFYs={projectValueProfitByFY.map((item: any) => item.fy).filter(Boolean) || []}
            filterControlledByParent
          />
        </div>
        <div className="w-full min-h-[360px] flex flex-col min-w-0">
          <AvailingLoanByBankChart data={data?.availingLoanByBank || []} />
        </div>
      </div>
    </div>
  )
}

export default FinanceDashboard
