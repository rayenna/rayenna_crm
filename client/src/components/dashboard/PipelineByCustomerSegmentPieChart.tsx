import { useState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'

export interface PipelineBySegmentItem {
  type: string
  label: string
  value: number
  count: number
  percentage: string
}

interface PipelineByCustomerSegmentPieChartProps {
  data?: PipelineBySegmentItem[]
}

const CHART_COLORS = ['#ef4444', '#3b82f6', '#10b981'] // Red, Blue, Green (same as Revenue by Customer Segment)

const PipelineByCustomerSegmentPieChart = ({ data: chartData = [] }: PipelineByCustomerSegmentPieChartProps) => {
  const { user } = useAuth()
  const [outerRadius, setOuterRadius] = useState(120)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastBucketRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT || user?.role === UserRole.SALES

  useEffect(() => {
    const getBucket = (width: number) => {
      if (width < 640) return 'sm'
      if (width < 1024) return 'md'
      return 'lg'
    }
    const applyBucket = (bucket: string) => {
      if (bucket === 'sm') {
        setOuterRadius(80)
      } else if (bucket === 'md') {
        setOuterRadius(100)
      } else {
        setOuterRadius(120)
      }
    }
    const updateRadius = () => {
      const width = window.innerWidth
      const bucket = getBucket(width)
      if (lastBucketRef.current !== bucket) {
        lastBucketRef.current = bucket
        applyBucket(bucket)
      }
    }
    const DEBOUNCE_MS = 400
    const handleResize = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        updateRadius()
      }, DEBOUNCE_MS)
    }
    const initialBucket = getBucket(window.innerWidth)
    lastBucketRef.current = initialBucket
    applyBucket(initialBucket)
    window.addEventListener('resize', handleResize, { passive: true })
    const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window
    if (isTouch && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }
    return () => {
      window.removeEventListener('resize', handleResize)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (isTouch && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  if (!canView) return null

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full min-h-[360px] flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Pipeline by Customer Segment
          </h2>
        </div>
        <div className="flex items-center justify-center text-gray-500" style={{ height: '320px' }}>
          <p>No pipeline data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-[360px] flex flex-col bg-gradient-to-br from-white via-primary-50/30 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Pipeline by Customer Segment
          </h2>
        </div>
      </div>
      {/* Fixed height so chart size does not change with empty/filtered data */}
      <div className="w-full overflow-x-auto flex flex-col items-center justify-center" style={{ height: '320px' }} ref={containerRef}>
        <div className="min-w-[280px] flex justify-center items-center" style={{ width: outerRadius * 2, height: 320, minHeight: 320 }}>
          <ResponsiveContainer width={outerRadius * 2} height={320}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={outerRadius * 0.55}
                outerRadius={outerRadius}
                labelLine={false}
                label={(entry: any) => {
                  const total = chartData.reduce((sum: number, item: any) => sum + item.value, 0)
                  const percentage = total > 0 ? (entry.value / total) * 100 : 0
                  if (percentage > 10) return `${entry.percentage}%`
                  return ''
                }}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
                          Pipeline: <span className="font-medium text-primary-600">₹{data.value.toLocaleString('en-IN')}</span>
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
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(_value, entry: any) => (
                  <span className="text-xs sm:text-sm">
                    {entry.payload.label}: ₹{entry.payload.value.toLocaleString('en-IN')} ({entry.payload.percentage}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default PipelineByCustomerSegmentPieChart
