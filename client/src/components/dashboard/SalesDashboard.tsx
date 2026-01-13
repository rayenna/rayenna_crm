import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProjectValuePieChart from './ProjectValuePieChart'

const SalesDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'sales'],
    queryFn: async () => {
      const res = await axios.get('/api/dashboard/sales')
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {/* Lead Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">{data?.leads?.total || 0}</div>
                <div className="text-sm text-gray-500">Total Leads</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.leads?.new || 0}
                </div>
                <div className="text-sm text-gray-500">New Leads</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.leads?.qualified || 0}
                </div>
                <div className="text-sm text-gray-500">Qualified Leads</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-green-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-green-600">
                  {data?.leads?.converted || 0}
                </div>
                <div className="text-sm text-gray-600">Converted Leads</div>
                <div className="text-xs text-gray-500 mt-1">
                  {data?.leads?.conversionRate || '0'}% conversion rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-gray-900">
              {data?.revenue?.totalCapacity?.toFixed(2) || 0} kW
            </div>
            <div className="text-sm text-gray-500">Total Capacity</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-primary-500">
          <div className="p-5">
            <div className="text-2xl font-bold text-primary-600">
              ₹{data?.revenue?.totalRevenue?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-2xl font-bold text-blue-600">
              ₹{data?.revenue?.expectedRevenue?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-sm text-gray-500">Expected Revenue</div>
          </div>
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Pipeline by Stage
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{data?.pipeline?.survey || 0}</div>
              <div className="text-xs text-gray-600">Survey</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{data?.pipeline?.proposal || 0}</div>
              <div className="text-xs text-gray-600">Proposal</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{data?.pipeline?.approved || 0}</div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{data?.pipeline?.atRisk || 0}</div>
              <div className="text-xs text-gray-600">At Risk</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Source Breakdown */}
      {data?.leads?.bySource && data.leads.bySource.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Leads by Source
            </h3>
            <div className="space-y-2">
              {data.leads.bySource.map((item: any) => (
                <div key={item.source} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{item.source.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">{item.count} leads</span>
                    <span className="text-sm text-blue-600">₹{item.expectedValue?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesDashboard
