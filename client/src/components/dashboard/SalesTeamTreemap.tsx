import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getSalesTeamColor } from './salesTeamColors'

interface SalesTeamData {
  salespersonId: string
  salespersonName: string
  totalOrderValue: number
  projectCount: number
}

interface DashboardFilterState {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

interface SalesTeamTreemapProps {
  availableFYs?: string[] // Available FYs from dashboard data (when not using dashboard filter)
  /** When set, chart uses dashboard FY/Qtr/Month filter only; no chart-level filter UI. */
  dashboardFilter?: DashboardFilterState | null
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

// Column chart doesn't need custom content component

const SalesTeamTreemap = ({ availableFYs = [], dashboardFilter }: SalesTeamTreemapProps) => {
  const filterControlledByParent = !!dashboardFilter
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  const effectiveFYs = filterControlledByParent
    ? (Array.isArray(dashboardFilter?.selectedFYs) ? dashboardFilter.selectedFYs : [])
    : selectedFYs
  const effectiveMonths = filterControlledByParent
    ? (Array.isArray(dashboardFilter?.selectedMonths) ? dashboardFilter.selectedMonths : [])
    : selectedMonths
  const effectiveQuarters = filterControlledByParent
    ? (Array.isArray(dashboardFilter?.selectedQuarters) ? dashboardFilter.selectedQuarters : [])
    : []

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

  // Clear months if FY selection changes to not exactly one FY (only when using own filters)
  useEffect(() => {
    if (!filterControlledByParent && selectedFYs.length !== 1) {
      setSelectedMonths([])
    }
  }, [filterControlledByParent, selectedFYs])

  // Fetch sales team performance: use dashboard filter when provided, else chart's own filters
  const { data, isLoading } = useQuery({
    queryKey: ['salesTeamPerformance', effectiveFYs, effectiveMonths, effectiveQuarters],
    queryFn: async () => {
      const params = new URLSearchParams()
      effectiveFYs.forEach((fy) => params.append('fy', fy))
      effectiveQuarters.forEach((q) => params.append('quarter', q))
      effectiveMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/sales-team-performance?${params.toString()}`)
      return res.data
    },
    enabled: true, // Always fetch, even with no filters (shows all data)
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
    setSelectedMonths((prev) => (prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]))
  }

  const clearFYFilter = () => {
    setSelectedFYs([])
    setSelectedMonths([]) // Clear months when FY is cleared
    setShowMonthDropdown(false) // Close month dropdown when FY is cleared
  }

  const clearMonthFilter = () => {
    setSelectedMonths([])
  }

  // Prepare data for treemap (fill by salesperson name so colors match Revenue by Sales Team chart)
  const treemapData = data?.salesTeamData?.map((item: SalesTeamData, index: number) => ({
    name: item.salespersonName,
    value: item.totalOrderValue,
    projectCount: item.projectCount,
    fill: getSalesTeamColor(item.salespersonName, index),
  })) || []

  return (
    <div className="h-full flex flex-col min-h-[360px] bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Pipeline by Sales Team Member
          </h2>
        </div>

        {/* Filters - only when not controlled by dashboard (FY, Qtr, Month at top) */}
        {!filterControlledByParent && (
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

          {/* Month Filter */}
          <div className="relative" ref={monthDropdownRef}>
            <button
              type="button"
              onClick={() => selectedFYs.length === 1 && setShowMonthDropdown(!showMonthDropdown)}
              disabled={selectedFYs.length !== 1}
              className={`flex items-center justify-between w-full sm:w-auto min-w-[180px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                selectedFYs.length !== 1
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
                  selectedFYs.length !== 1 ? 'text-gray-400' : 'text-gray-500'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMonthDropdown && selectedFYs.length === 1 && (
              <div className="absolute z-10 mt-1 w-full sm:w-auto min-w-[200px] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
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
        )}
      </div>

      {/* Column Chart - fixed height so size does not change with empty/loading data */}
      <div className="flex flex-col" style={{ height: '320px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : !treemapData || treemapData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <p className="text-gray-500 text-center px-4">No sales team data available for the selected filters</p>
          </div>
        ) : (
          <div className="w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={treemapData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="4%"
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
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
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
                <Bar dataKey="value" name="Total Order Value" radius={[8, 8, 0, 0]}>
                  {treemapData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export default SalesTeamTreemap
