import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import SalesDashboard from '../components/dashboard/SalesDashboard'
import OperationsDashboard from '../components/dashboard/OperationsDashboard'
import FinanceDashboard from '../components/dashboard/FinanceDashboard'
import ManagementDashboard from '../components/dashboard/ManagementDashboard'

const Dashboard = () => {
  const { user } = useAuth()

  const getDashboardComponent = () => {
    switch (user?.role) {
      case UserRole.SALES:
        return <SalesDashboard />
      case UserRole.OPERATIONS:
        return <OperationsDashboard />
      case UserRole.FINANCE:
        return <FinanceDashboard />
      case UserRole.MANAGEMENT:
        return <ManagementDashboard />
      case UserRole.ADMIN:
        return <ManagementDashboard />
      default:
        return <div>No dashboard available</div>
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      {getDashboardComponent()}
    </div>
  )
}

export default Dashboard
