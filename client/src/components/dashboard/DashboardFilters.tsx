import { useState, useEffect, useRef } from 'react'

interface DashboardFiltersProps {
  availableFYs: string[]
  selectedFYs: string[]
  selectedMonths: string[]
  onFYChange: (fys: string[]) => void
  onMonthChange: (months: string[]) => void
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

const DashboardFilters = ({
  availableFYs,
  selectedFYs,
  selectedMonths,
  onFYChange,
  onMonthChange,
}: DashboardFiltersProps) => {
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

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
      onMonthChange([])
    }
  }, [selectedFYs, onMonthChange])

  const toggleFY = (fy: string) => {
    if (selectedFYs.includes(fy)) {
      onFYChange(selectedFYs.filter((f) => f !== fy))
    } else {
      onFYChange([...selectedFYs, fy])
    }
  }

  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      onMonthChange(selectedMonths.filter((m) => m !== month))
    } else {
      onMonthChange([...selectedMonths, month])
    }
  }

  const clearFYFilter = () => {
    onFYChange([])
    onMonthChange([])
  }

  const clearMonthFilter = () => {
    onMonthChange([])
  }

  const isMonthFilterDisabled = selectedFYs.length !== 1

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-6">
      {/* FY Filter */}
      <div className="relative" ref={fyDropdownRef}>
        <button
          type="button"
          onClick={() => setShowFYDropdown(!showFYDropdown)}
          className="flex items-center justify-between w-full sm:w-auto min-w-[180px] px-4 py-2.5 text-sm border-2 border-primary-300 rounded-xl bg-gradient-to-r from-white to-primary-50 hover:from-primary-50 hover:to-primary-100 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-medium text-gray-700"
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
          <div className="absolute z-10 mt-2 w-full sm:w-auto min-w-[200px] bg-white border-2 border-primary-200 rounded-xl shadow-2xl max-h-60 overflow-auto backdrop-blur-sm">
            <div className="p-2">
              {availableFYs.length > 0 ? (
                <>
                  {availableFYs.map((fy) => (
                    <label
                      key={fy}
                      className="flex items-center px-3 py-2.5 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 cursor-pointer rounded-lg transition-all duration-200 hover:shadow-sm"
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
                      className="w-full mt-2 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
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
              className={`flex items-center justify-between w-full sm:w-auto min-w-[180px] px-4 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-lg transition-all duration-300 font-medium ${
                isMonthFilterDisabled
                  ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-white to-primary-50 border-primary-300 hover:from-primary-50 hover:to-primary-100 hover:border-primary-500 hover:shadow-xl text-gray-700 transform hover:-translate-y-0.5'
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
          <div className="absolute z-10 mt-2 w-full sm:w-auto min-w-[200px] bg-white border-2 border-primary-200 rounded-xl shadow-2xl max-h-60 overflow-auto backdrop-blur-sm">
            <div className="p-2">
              {MONTHS.map((month) => (
                <label
                  key={month.value}
                  className="flex items-center px-3 py-2.5 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 cursor-pointer rounded-lg transition-all duration-200 hover:shadow-sm"
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
                  className="w-full mt-2 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
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
  )
}

export default DashboardFilters
