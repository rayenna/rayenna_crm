import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface SalesTeamData {
  salespersonId: string
  salespersonName: string
  totalOrderValue: number
  projectCount: number
}

interface SalesTeamTreemapProps {
  availableFYs?: string[] // Available FYs from dashboard data
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

// Color palette for treemap
const COLORS = [
  '#10b981', // Green
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
]

// Column chart doesn't need custom content component

const SalesTeamTreemap = ({ availableFYs = [] }: SalesTeamTreemapProps) => {
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  // Debug: Log component mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SalesTeamTreemap] Component mounted')
      console.log('[SalesTeamTreemap] availableFYs:', availableFYs)
    }
  }, [availableFYs])

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

  // Fetch sales team performance data with filters
  const { data, isLoading } = useQuery({
    queryKey: ['salesTeamPerformance', selectedFYs, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axios.get(`/api/sales-team-performance?${params.toString()}`)
      return res.data
    },
    enabled: true, // Always fetch, even with no filters (shows all data)
  })

  const toggleFY = (fy: string) => {
    setSelectedFYs((prev) => (prev.includes(fy) ? prev.filter((f) => f !== fy) : [...prev, fy]))
  }

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) => (prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]))
  }

  const clearFYFilter = () => {
    setSelectedFYs([])
    setSelectedMonths([])
  }

  const clearMonthFilter = () => {
    setSelectedMonths([])
  }

  // Prepare data for treemap
  const treemapData = data?.salesTeamData?.map((item: SalesTeamData, index: number) => ({
    name: item.salespersonName,
    value: item.totalOrderValue,
    projectCount: item.projectCount,
    fill: COLORS[index % COLORS.length],
  })) || []

  const isMonthFilterDisabled = selectedFYs.length !== 1

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SalesTeamTreemap] Component rendered')
      console.log('[SalesTeamTreemap] Data received:', data)
      console.log('[SalesTeamTreemap] salesTeamData:', data?.salesTeamData)
      console.log('[SalesTeamTreemap] treemapData:', treemapData)
      console.log('[SalesTeamTreemap] isLoading:', isLoading)
      console.log('[SalesTeamTreemap] treemapData length:', treemapData?.length || 0)
    }
  }, [data, treemapData, isLoading])

  return (
    <div className="bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-6 h-full flex flex-col backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
            Total Order Value by Sales Team Member
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* FY Filter */}
          <div className="relative" ref={fyDropdownRef}>
            <button
              type="button"
              onClick={() => setShowFYDropdown(!showFYDropdown)}
              className="flex items-center justify-between w-full sm:w-auto min-w-[180px] px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <span className="text-gray-700">
                {selectedFYs.length === 0
                  ? 'All Financial Years'
                  : selectedFYs.length === 1
                  ? selectedFYs[0]
                  : `${selectedFYs.length} FYs selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${showFYDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFYDropdown && (
              <div className="absolute z-10 mt-1 w-full sm:w-auto min-w-[200px] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-2">
                  {availableFYs.length > 0 ? (
                    <>
                      {availableFYs.map((fy) => (
                        <label
                          key={fy}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFYs.includes(fy)}
                            onChange={() => toggleFY(fy)}
                            className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{fy}</span>
                        </label>
                      ))}
                      {selectedFYs.length > 0 && (
                        <button
                          onClick={clearFYFilter}
                          className="w-full mt-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded"
                        >
                          Clear Filter
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No FY data available</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Month Filter */}
          <div className="relative" ref={monthDropdownRef}>
            <button
              type="button"
              onClick={() => !isMonthFilterDisabled && setShowMonthDropdown(!showMonthDropdown)}
              disabled={isMonthFilterDisabled}
              className={`flex items-center justify-between w-full sm:w-auto min-w-[180px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                isMonthFilterDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span>
                {selectedMonths.length === 0
                  ? 'All Months'
                  : selectedMonths.length === 1
                  ? MONTHS.find((m) => m.value === selectedMonths[0])?.label || selectedMonths[0]
                  : `${selectedMonths.length} months selected`}
              </span>
              <svg
                className={`ml-2 h-4 w-4 transition-transform ${showMonthDropdown ? 'rotate-180' : ''} ${
                  isMonthFilterDisabled ? 'text-gray-400' : 'text-gray-500'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isMonthFilterDisabled && showMonthDropdown && (
              <div className="absolute z-10 mt-1 w-full sm:w-auto min-w-[200px] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-2">
                  {MONTHS.map((month) => (
                    <label
                      key={month.value}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMonths.includes(month.value)}
                        onChange={() => toggleMonth(month.value)}
                        className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{month.label}</span>
                    </label>
                  ))}
                  {selectedMonths.length > 0 && (
                    <button
                      onClick={clearMonthFilter}
                      className="w-full mt-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
            )}
            {isMonthFilterDisabled && (
              <p className="mt-1 text-xs text-gray-500">Select exactly one FY to filter by month</p>
            )}
          </div>
        </div>
      </div>

      {/* Column Chart */}
      <div className="flex-1 flex flex-col" style={{ minHeight: '500px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height: '500px' }}>
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : !treemapData || treemapData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: '500px' }}>
            <p className="text-gray-500">No sales team data available for the selected filters</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '500px' }}>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={treemapData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  label={{ value: 'Total Order Value (₹)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
                          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                          <p className="text-gray-600">
                            Total Order Value:{' '}
                            <span className="font-medium text-primary-600">
                              ₹{data.value.toLocaleString('en-IN')}
                            </span>
                          </p>
                          <p className="text-gray-600">
                            Projects: <span className="font-medium text-primary-600">{data.projectCount}</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Bar dataKey="value" name="Total Order Value" radius={[8, 8, 0, 0]}>
                  {treemapData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary Table */}
      {treemapData && treemapData.length > 0 && (
        <div className="mt-4 sm:mt-6 overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salesperson
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projects
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Order Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {treemapData
                    .sort((a: any, b: any) => b.value - a.value)
                    .map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: item.fill }}
                            ></div>
                            <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-gray-900">
                          {item.projectCount}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                          ₹{item.value.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesTeamTreemap
