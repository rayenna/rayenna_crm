import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'

interface RevenueByLeadSourceData {
  leadSource: string
  leadSourceLabel: string
  revenue: number
  projectCount: number
}

interface RevenueByLeadSourceChartProps {
  availableFYs?: string[] // Available FYs for filter dropdown
}

// Months ordered from April to March (Financial Year order)
const MONTHS = [
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
]

const RevenueByLeadSourceChart = ({ availableFYs = [] }: RevenueByLeadSourceChartProps) => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  // Role-based access: Only show for ADMIN, MANAGEMENT, SALES
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fyDropdownRef.current && !fyDropdownRef.current.contains(event.target as Node)) {
        setShowFYDropdown(false)
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear months if FY selection changes to not exactly one FY
  useEffect(() => {
    if (selectedFYs.length !== 1) {
      setSelectedMonths([])
    }
  }, [selectedFYs])

  // Fetch chart data independently based on chart's own filters
  const { data, isLoading } = useQuery({
    queryKey: ['revenueByLeadSource', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/revenue-by-lead-source?${params.toString()}`)
      return res.data
    },
    enabled: canView, // Only fetch if user has access
    staleTime: 30000, // Cache for 30 seconds
  })

  const toggleFY = (fy: string) => {
    setSelectedFYs((prev) => {
      const newFYs = prev.includes(fy) ? prev.filter((f) => f !== fy) : [...prev, fy]
      // Clear months if not exactly one FY selected
      if (newFYs.length !== 1) {
        setSelectedMonths([])
        setShowMonthDropdown(false)
      }
      return newFYs
    })
  }

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    )
  }

  const clearFYFilter = () => {
    setSelectedFYs([])
    setSelectedMonths([]) // Clear months when FY is cleared
    setShowMonthDropdown(false) // Close month dropdown when FY is cleared
  }

  const clearMonthFilter = () => {
    setSelectedMonths([])
  }

  // Don't render if user doesn't have access
  if (!canView) {
    return null
  }

  const chartData = data?.revenueByLeadSource as RevenueByLeadSourceData[] || []

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`
  }

  // Color palette for stacked bars (using gradient colors)
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ]

  return (
    <div className="bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Revenue by Lead Source
          </h2>
        </div>

        {/* Filters - Side by Side */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* FY Filter Dropdown */}
          <div className="relative flex-1" ref={fyDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Financial Year:
            </label>
            <button
              type="button"
              onClick={() => setShowFYDropdown(!showFYDropdown)}
              className="w-full text-left border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between"
            >
              <span className={selectedFYs.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
                {selectedFYs.length === 0
                  ? 'Select FY'
                  : selectedFYs.length === 1
                  ? selectedFYs[0]
                  : `${selectedFYs.length} selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
                  showFYDropdown ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFYDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {availableFYs.length > 0 ? (
                  <>
                    {availableFYs.map((fy) => (
                      <label
                        key={fy}
                        className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFYs.includes(fy)}
                          onChange={() => toggleFY(fy)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{fy}</span>
                      </label>
                    ))}
                    {selectedFYs.length > 0 && (
                      <div className="border-t border-gray-200 px-4 py-2">
                        <button
                          type="button"
                          onClick={clearFYFilter}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500">No FYs available</div>
                )}
              </div>
            )}
          </div>

          {/* Month Filter Dropdown */}
          <div className="relative flex-1" ref={monthDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month:
            </label>
            <button
              type="button"
              onClick={() => selectedFYs.length === 1 && setShowMonthDropdown(!showMonthDropdown)}
              disabled={selectedFYs.length !== 1}
              className="w-full text-left border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <span className={selectedMonths.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
                {selectedMonths.length === 0
                  ? 'Select Month'
                  : selectedMonths.length === 1
                  ? MONTHS.find((m) => m.value === selectedMonths[0])?.label
                  : `${selectedMonths.length} selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
                  showMonthDropdown ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMonthDropdown && selectedFYs.length === 1 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {MONTHS.map((month) => (
                  <label
                    key={month.value}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month.value)}
                      onChange={() => toggleMonth(month.value)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">{month.label}</span>
                  </label>
                ))}
                {selectedMonths.length > 0 && (
                  <div className="border-t border-gray-200 px-4 py-2">
                    <button
                      type="button"
                      onClick={clearMonthFilter}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
            {selectedFYs.length !== 1 && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedFYs.length === 0 ? 'Select one FY to enable month filter' : 'Select only one FY to enable month filter'}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Chart or Loading/No Data */}
      <div className="w-full overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-sm text-gray-500">Loading chart data...</p>
            </div>
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
            <div className="text-center px-4">
              <p className="mb-2 text-sm sm:text-base text-gray-500">No data for selected period</p>
              <p className="text-xs sm:text-sm text-gray-600">Revenue data will appear here when projects are confirmed and completed.</p>
            </div>
          </div>
        ) : (
          <div className="min-w-[300px]" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60, // Extra space for rotated labels
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="leadSourceLabel" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  label={{ value: 'Lead Source', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  tickFormatter={(value) => {
                    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
                    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
                    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
                    return `₹${value.toLocaleString('en-IN')}`
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as RevenueByLeadSourceData
                      return (
                        <div className="bg-gradient-to-br from-white to-primary-50 p-4 border-2 border-primary-200 rounded-xl shadow-2xl backdrop-blur-sm">
                          <p className="font-semibold text-gray-900 mb-2">
                            {data.leadSourceLabel}
                          </p>
                          <p className="text-sm text-purple-600">
                            Total Revenue: <span className="font-medium">{formatCurrency(data.revenue)}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Projects: <span className="font-medium">{data.projectCount}</span>
                          </p>
                          {selectedFYs.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">FY: {selectedFYs.join(', ')}</p>
                          )}
                          {selectedMonths.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Month: {selectedMonths.map(m => MONTHS.find(month => month.value === m)?.label).join(', ')}
                            </p>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  name="Revenue (₹)" 
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 text-center mt-4 italic">
        Actual revenue generated from confirmed and completed projects
      </p>
    </div>
  )
}

export default RevenueByLeadSourceChart
