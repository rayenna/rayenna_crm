import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'

const SalesDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'sales'],
    queryFn: async () => {
      const res = await axios.get('/api/dashboard/sales')
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Lead Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-4 sm:p-5">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{data?.leads?.total || 0}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">Total Leads</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-4 sm:p-5">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {data?.leads?.new || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">New Leads</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-4 sm:p-5">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {data?.leads?.qualified || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">Qualified</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border-l-4 border-green-500 hover:shadow-md transition-shadow">
          <div className="p-4 sm:p-5">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {data?.leads?.converted || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Converted</div>
            <div className="text-xs text-gray-500 mt-1">
              {data?.leads?.conversionRate || '0'}% rate
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-4 sm:p-5">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {(data?.revenue?.totalCapacity || 0).toFixed(2)} <span className="text-base sm:text-lg font-normal text-gray-600">kW</span>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">Total Capacity</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border-l-4 border-primary-500 hover:shadow-md transition-shadow">
          <div className="p-4 sm:p-5">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary-600 break-words">
              ₹{(data?.revenue?.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Revenue</div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-4 sm:p-5">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 break-words">
              ₹{(data?.revenue?.expectedRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">Expected Revenue</div>
          </div>
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-100">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Pipeline by Stage
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{data?.pipeline?.survey || 0}</div>
              <div className="text-xs sm:text-sm text-gray-700 mt-1 font-medium">Survey</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{data?.pipeline?.proposal || 0}</div>
              <div className="text-xs sm:text-sm text-gray-700 mt-1 font-medium">Proposal</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{data?.pipeline?.approved || 0}</div>
              <div className="text-xs sm:text-sm text-gray-700 mt-1 font-medium">Approved</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{data?.pipeline?.atRisk || 0}</div>
              <div className="text-xs sm:text-sm text-gray-700 mt-1 font-medium">At Risk</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Source Breakdown */}
      {data?.leads?.bySource && data.leads.bySource.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              Leads by Source
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {data.leads.bySource.map((item: any) => (
                <div key={item.source} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-700 capitalize">{item.source.replace(/_/g, ' ')}</span>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <span className="text-sm font-semibold text-gray-900">{item.count} <span className="font-normal text-gray-600">leads</span></span>
                    <span className="text-sm font-semibold text-blue-600">₹{(item.expectedValue || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      <div className="w-full overflow-hidden">
        <ProjectValueProfitByFYChart data={data?.projectValueProfitByFY || []} />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Project Value by Segment Pie Chart */}
        {data?.projectValueByType && data.projectValueByType.length > 0 && (
          <div className="w-full flex">
            <ProjectValuePieChart data={data.projectValueByType} />
          </div>
        )}
        {/* Customer Profitability Word Cloud */}
        <div className="w-full flex">
          <ProfitabilityWordCloud 
            availableFYs={data?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []} 
          />
        </div>
      </div>
    </div>
  )
}

export default SalesDashboard
