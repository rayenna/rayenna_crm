import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import SalesDashboard from '../components/dashboard/SalesDashboard'
import OperationsDashboard from '../components/dashboard/OperationsDashboard'
import FinanceDashboard from '../components/dashboard/FinanceDashboard'
import ManagementDashboard from '../components/dashboard/ManagementDashboard'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])

  // Fetch available FYs from dashboard data based on user role
  const { data: dashboardData } = useQuery({
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
    <div className="px-4 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden">
      <div className="mb-6 animate-slide-up min-w-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary-800 mb-2 sm:mb-3 break-words">
          Dashboard
        </h1>
        <p className="text-gray-600 font-medium text-base sm:text-lg break-words">Monitor your business performance at a glance</p>
      </div>
      <DashboardFilters
        availableFYs={availableFYs}
        selectedFYs={selectedFYs}
        selectedQuarters={selectedQuarters}
        selectedMonths={selectedMonths}
        onFYChange={setSelectedFYs}
        onQuarterChange={setSelectedQuarters}
        onMonthChange={setSelectedMonths}
      />
      {getDashboardComponent()}

      {/* Footnote for Admin, Sales and Management views */}
      {(user?.role === UserRole.ADMIN || user?.role === UserRole.SALES || user?.role === UserRole.MANAGEMENT) && (
        <footer className="mt-8 pt-6 border-t border-gray-200 min-w-0 max-w-full">
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
    </div>
  )
}

export default Dashboard
