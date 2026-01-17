import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { FaUsers, FaBolt, FaRupeeSign, FaCheckCircle, FaClipboardList, FaExclamationTriangle, FaChartLine } from 'react-icons/fa'
import ProjectValuePieChart from './ProjectValuePieChart'
import ProjectValueProfitByFYChart from './ProjectValueProfitByFYChart'
import ProfitabilityWordCloud from './ProfitabilityWordCloud'
import MetricCard from './MetricCard'

interface SalesDashboardProps {
  selectedFYs: string[]
  selectedMonths: string[]
}

const SalesDashboard = ({ selectedFYs, selectedMonths }: SalesDashboardProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'sales', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/sales?${params.toString()}`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  // Debug: Log data to console (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Sales Dashboard Data:', data)
    console.log('Project Value Profit By FY:', data?.projectValueProfitByFY)
    console.log('Project Value By Type:', data?.projectValueByType)
    console.log('Word Cloud Data:', data?.wordCloudData)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics Row - 5 columns */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Leads"
          value={data?.leads?.total || 0}
          icon={<FaUsers />}
          gradient="from-blue-500 to-cyan-500"
        />
        <MetricCard
          title="Total Capacity"
          value={`${Math.round(data?.revenue?.totalCapacity || 0)} kW`}
          icon={<FaBolt />}
          gradient="from-yellow-500 to-orange-500"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${Math.round(data?.revenue?.totalRevenue || 0).toLocaleString('en-IN')}`}
          icon={<FaRupeeSign />}
          gradient="from-green-500 to-emerald-500"
        />
        <MetricCard
          title="Total Pipeline"
          value={`₹${Math.round(data?.totalPipeline || 0).toLocaleString('en-IN')}`}
          icon={<FaChartLine />}
          gradient="from-indigo-500 to-purple-500"
        />
        <MetricCard
          title="Approved Projects"
          value={data?.pipeline?.approved || 0}
          icon={<FaCheckCircle />}
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      {/* Second Metrics Row - 3 columns */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Survey Stage"
          value={data?.pipeline?.survey || 0}
          icon={<FaClipboardList />}
          gradient="from-indigo-500 to-blue-500"
        />
        <MetricCard
          title="Proposal Stage"
          value={data?.pipeline?.proposal || 0}
          icon={<FaClipboardList />}
          gradient="from-yellow-500 to-amber-500"
        />
        <MetricCard
          title="At Risk"
          value={data?.pipeline?.atRisk || 0}
          icon={<FaExclamationTriangle />}
          gradient="from-red-500 to-rose-500"
        />
      </div>

      {/* Project Value and Profit by Financial Year - Grouped Column Chart */}
      <div className="w-full bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <ProjectValueProfitByFYChart data={data?.projectValueProfitByFY || []} />
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Project Value by Segment Pie Chart */}
        <div className="w-full">
          {data?.projectValueByType && data.projectValueByType.length > 0 ? (
            <ProjectValuePieChart 
              data={data.projectValueByType} 
              availableFYs={data?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []}
              dashboardType="sales"
            />
          ) : (
            <div className="w-full bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-6 flex items-center justify-center min-h-[500px] backdrop-blur-sm">
              <div className="text-center text-gray-500">
                <p className="text-base font-medium">No project data available</p>
                <p className="text-sm mt-2">Project Value by Customer Segment chart will appear here when data is available.</p>
              </div>
            </div>
          )}
        </div>
        {/* Customer Profitability Word Cloud */}
        <div className="w-full">
          <ProfitabilityWordCloud 
            availableFYs={data?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []} 
          />
        </div>
      </div>
    </div>
  )
}

export default SalesDashboard
