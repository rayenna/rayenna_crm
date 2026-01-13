import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'

const ManagementDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'management'],
    queryFn: async () => {
      const res = await axios.get('/api/dashboard/management')
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  // Debug: Log data to console (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Management Dashboard Data:', data)
    console.log('Project Value Profit By FY:', data?.projectValueProfitByFY)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              {data?.sales?.totalLeads || 0}
            </div>
            <div className="text-sm text-gray-500">Total Leads</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              {data?.sales?.totalCapacity?.toFixed(2) || 0} kW
            </div>
            <div className="text-sm text-gray-500">Total Capacity</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              ₹{data?.finance?.totalValue?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-sm text-gray-500">Total Project Value</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-primary-600">
              ₹{data?.finance?.totalProfit?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-sm text-gray-500">Total Profit</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              {data?.operations?.pendingInstallation || 0}
            </div>
            <div className="text-sm text-gray-500">Pending Installation</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-yellow-600">
              {data?.operations?.pendingSubsidy || 0}
            </div>
            <div className="text-sm text-gray-500">Pending Subsidy</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-primary-600">
              {data?.operations?.subsidyCredited || 0}
            </div>
            <div className="text-sm text-gray-500">Subsidy Credited</div>
          </div>
        </div>
      </div>

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      <div className="w-full">
        <ProjectValueProfitByFYChart data={data?.projectValueProfitByFY || []} />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Project Value by Segment Pie Chart */}
        {data?.projectValueByType && data.projectValueByType.length > 0 && (
          <div className="lg:col-span-1">
            <ProjectValuePieChart data={data.projectValueByType} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ManagementDashboard
