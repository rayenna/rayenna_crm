import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import SalesDashboard from '../components/dashboard/SalesDashboard'
import OperationsDashboard from '../components/dashboard/OperationsDashboard'
import FinanceDashboard from '../components/dashboard/FinanceDashboard'
import ManagementDashboard from '../components/dashboard/ManagementDashboard'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import PageCard from '../components/PageCard'
import { FaChartLine } from 'react-icons/fa'

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])

  // Fetch available FYs from dashboard data based on user role
  const { data: dashboardData, error: fyError, isError: isFyError, refetch: refetchFYs } = useQuery({
    queryKey: ['dashboard', 'fys', user?.role],
    queryFn: async () => {
      // For sales users, fetch from sales endpoint to get only their FYs
      if (user?.role === UserRole.SALES) {
        const res = await axiosInstance.get('/api/dashboard/sales')
        return res.data
      }
      // For other roles, use management endpoint to get all FYs
      const res = await axiosInstance.get('/api/dashboard/management')
      return res.data
    },
    enabled: !!user, // Fetch to get available FYs
  })

  const availableFYs =
    dashboardData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []

  const getDashboardComponent = () => {
    switch (user?.role) {
      case UserRole.SALES:
        return <SalesDashboard selectedFYs={selectedFYs} selectedQuarters={selectedQuarters} selectedMonths={selectedMonths} />
      case UserRole.OPERATIONS:
        return <OperationsDashboard selectedFYs={selectedFYs} selectedQuarters={selectedQuarters} selectedMonths={selectedMonths} />
      case UserRole.FINANCE:
        return <FinanceDashboard selectedFYs={selectedFYs} selectedQuarters={selectedQuarters} selectedMonths={selectedMonths} />
      case UserRole.MANAGEMENT:
        return <ManagementDashboard selectedFYs={selectedFYs} selectedQuarters={selectedQuarters} selectedMonths={selectedMonths} />
      case UserRole.ADMIN:
        return <ManagementDashboard selectedFYs={selectedFYs} selectedQuarters={selectedQuarters} selectedMonths={selectedMonths} />
      default:
        return <div>No dashboard available</div>
    }
  }

  return (
    <div className="px-0 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden dashboard-mobile-no-clip">
      <PageCard
        title="Dashboard"
        subtitle="Monitor your business performance at a glance"
        icon={<FaChartLine className="w-5 h-5 text-white" />}
        className="max-w-full page-card-no-clip-mobile"
      >
      <DashboardFilters
        availableFYs={availableFYs}
        selectedFYs={selectedFYs}
        selectedQuarters={selectedQuarters}
        selectedMonths={selectedMonths}
        onFYChange={setSelectedFYs}
        onQuarterChange={setSelectedQuarters}
        onMonthChange={setSelectedMonths}
      />
      {isFyError && (
        <div className="w-full min-w-0 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 md:p-6 text-amber-800 text-sm sm:text-base break-words">
          <p className="font-medium">Unable to load dashboard filters.</p>
          <p className="mt-2 text-amber-700 leading-snug">{getFriendlyApiErrorMessage(fyError)}</p>
          <button
            type="button"
            onClick={() => refetchFYs()}
            className="mt-4 min-h-[44px] px-4 py-3 sm:py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 active:opacity-90 touch-manipulation"
          >
            Try again
          </button>
        </div>
      )}
      {!isFyError && getDashboardComponent()}

      {/* Footnote for Operations view */}
      {user?.role === UserRole.OPERATIONS && (
        <footer className="mt-8 pt-6 border-t border-primary-100 min-w-0 max-w-full bg-gradient-to-br from-primary-50/30 to-transparent rounded-xl p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed break-words">
            <span className="font-semibold text-gray-600">Note:</span>
            <br />
            1. Pending Installation Quick Access Tile displays those projects, which are in Stages "Confirmed" and "Under Installation"
          </p>
        </footer>
      )}

      {/* Footnote for Admin, Sales and Management views */}
      {(user?.role === UserRole.ADMIN || user?.role === UserRole.SALES || user?.role === UserRole.MANAGEMENT) && (
        <footer className="mt-8 pt-6 border-t border-primary-100 min-w-0 max-w-full bg-gradient-to-br from-primary-50/30 to-transparent rounded-xl p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed break-words">
            <span className="font-semibold text-gray-600">Note:</span>
            <br />
            1. Revenue = Sum of Order Value of Projects in the Project Stages – a. Confirmed Order, b. Installation, c. Completed and; d. Completed – Subsidy Credited
            <br />
            2. Pipeline = Sum of Order Value of Projects in all Project Stages EXCEPT Lost
            <br />
            3. Pipeline Conversion (%) = (Total Revenue / Total Pipeline) × 100
            <br />
            4. Open Deals includes those that are in Lead, Site Survey and Proposal stages.
          </p>
        </footer>
      )}
      </PageCard>
    </div>
  )
}

export default Dashboard
