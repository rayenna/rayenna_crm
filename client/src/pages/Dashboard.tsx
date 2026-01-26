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
        return <SalesDashboard selectedFYs={selectedFYs} selectedMonths={selectedMonths} />
      case UserRole.OPERATIONS:
        return <OperationsDashboard selectedFYs={selectedFYs} selectedMonths={selectedMonths} />
      case UserRole.FINANCE:
        return <FinanceDashboard selectedFYs={selectedFYs} selectedMonths={selectedMonths} />
      case UserRole.MANAGEMENT:
        return <ManagementDashboard selectedFYs={selectedFYs} selectedMonths={selectedMonths} />
      case UserRole.ADMIN:
        return <ManagementDashboard selectedFYs={selectedFYs} selectedMonths={selectedMonths} />
      default:
        return <div>No dashboard available</div>
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 animate-slide-up">
        <h1 className="text-4xl font-extrabold text-primary-800 mb-3">
          Dashboard
        </h1>
        <p className="text-gray-600 font-medium text-lg">Monitor your business performance at a glance</p>
      </div>
      <DashboardFilters
        availableFYs={availableFYs}
        selectedFYs={selectedFYs}
        selectedMonths={selectedMonths}
        onFYChange={setSelectedFYs}
        onMonthChange={setSelectedMonths}
      />
      {getDashboardComponent()}
    </div>
  )
}

export default Dashboard
