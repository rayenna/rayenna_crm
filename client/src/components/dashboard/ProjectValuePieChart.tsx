import { useState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getSegmentColor } from './segmentColors'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'

interface ProjectValueByType {
  type: string
  label: string
  value: number
  count: number
  percentage: string
}

interface ProjectValuePieChartProps {
  data?: ProjectValueByType[] // Optional - chart will fetch its own data if not provided
  availableFYs?: string[] // Available financial years from dashboard
  dashboardType?: 'management' | 'sales' | 'operations' | 'finance'
  filterControlledByParent?: boolean
}

// Fixed size for stability; percentages shown in Legend/Tooltip only
const DONUT_SIZE = 200 // diameter
const OUTER_R = DONUT_SIZE / 2
const INNER_R = OUTER_R * 0.55

const ProjectValuePieChart = ({ data: initialData, availableFYs = [], dashboardType = 'management', filterControlledByParent }: ProjectValuePieChartProps) => {
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fyDropdownRef.current && !fyDropdownRef.current.contains(event.target as Node)) {
        setShowFYDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Fetch available FYs if not provided
  const { data: fyData } = useQuery({
    queryKey: ['dashboard', dashboardType, 'fys'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/dashboard/${dashboardType}`)
      return res.data
    },
    enabled: availableFYs.length === 0, // Only fetch if availableFYs not provided
    staleTime: 300000, // Cache for 5 minutes
  })

  const finalAvailableFYs = availableFYs.length > 0 
    ? availableFYs 
    : fyData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []

  const { data: filteredData, isLoading: isLoadingFiltered } = useQuery({
    queryKey: ['projectValueByType', dashboardType, selectedFYs],
    queryFn: async () => {
      const endpoint = `/api/dashboard/${dashboardType}`
      if (selectedFYs.length === 0) {
        const res = await axiosInstance.get(endpoint)
        return res.data.projectValueByType || []
      }
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      const res = await axiosInstance.get(`${endpoint}?${params.toString()}`)
      return res.data.projectValueByType || []
    },
    enabled: !filterControlledByParent,
    staleTime: 30000,
  })

  const chartData = filterControlledByParent ? (initialData || []) : (filteredData || initialData || [])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full min-h-[360px] flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Revenue by Customer Segment
          </h2>
        </div>
        <div className="flex items-center justify-center text-gray-500" style={{ height: '320px' }}>
          <p>No project data available</p>
        </div>
      </div>
    )
  }

  // Use chart data (already filtered by chart's own filter)
  const displayData = chartData

  return (
    <div className="w-full min-h-[360px] flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Revenue by Customer Segment
          </h2>
        </div>
        {!filterControlledByParent && finalAvailableFYs && finalAvailableFYs.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative w-[192px]" ref={fyDropdownRef}>
              <button
                type="button"
                onClick={() => setShowFYDropdown(!showFYDropdown)}
                disabled={isLoadingFiltered}
                className="w-full text-left border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
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
                  {finalAvailableFYs.length > 0 ? (
                    <>
                      {finalAvailableFYs.map((fy: string) => (
                        <label
                          key={fy}
                          className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFYs.includes(fy)}
                            onChange={() => {
                              setSelectedFYs((prev) => 
                                prev.includes(fy) ? prev.filter((f) => f !== fy) : [...prev, fy]
                              )
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-900">{fy}</span>
                        </label>
                      ))}
                      {selectedFYs.length > 0 && (
                        <div className="border-t border-gray-200 px-4 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedFYs([])}
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
            {isLoadingFiltered && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
          </div>
        )}
      </div>
      {/* On mobile portrait use visible so chart isn’t clipped when page scrolls; from sm up allow horizontal scroll */}
      <div className="w-full flex justify-center" style={{ height: '320px' }}>
        <div className="flex flex-col items-center justify-center">
          <div style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
            <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
              <PieChart>
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={INNER_R}
                  outerRadius={OUTER_R}
                  labelLine={false}
                  label={false}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {displayData.map((item: ProjectValueByType, index: number) => (
                    <Cell key={`cell-${index}`} fill={getSegmentColor(item.type, index)} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-2 sm:p-3 border border-gray-200 rounded-lg shadow-lg text-xs sm:text-sm">
                          <p className="font-semibold text-gray-900">{data.label}</p>
                          <p className="text-gray-600">
                            Value: <span className="font-medium text-primary-600">₹{data.value.toLocaleString('en-IN')}</span>
                          </p>
                          <p className="text-gray-600">
                            Percentage: <span className="font-medium text-primary-600">{data.percentage}%</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Projects: {data.count}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend below donut: percentages visible; scrolls with chart */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-2 text-sm font-medium text-gray-700 min-w-0 max-w-full">
            {displayData.map((item: ProjectValueByType, index: number) => (
              <span key={item.type} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getSegmentColor(item.type, index) }} />
                <span>{item.label}: {item.percentage}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectValuePieChart
