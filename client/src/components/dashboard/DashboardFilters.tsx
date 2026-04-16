import { useState, useEffect, useRef } from 'react'

interface DashboardFiltersProps {
  availableFYs: string[]
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  onFYChange: (fys: string[]) => void
  onQuarterChange: (quarters: string[]) => void
  onMonthChange: (months: string[]) => void
  /** Compact layout for embedding inside dense filter panels (e.g. Projects page). */
  compact?: boolean
  /** Dark glass styling for Zenith-themed pages. */
  variant?: 'default' | 'zenith'
}

// Quarters: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar
const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Apr–Jun)' },
  { value: 'Q2', label: 'Q2 (Jul–Sep)' },
  { value: 'Q3', label: 'Q3 (Oct–Dec)' },
  { value: 'Q4', label: 'Q4 (Jan–Mar)' },
]

// Quarter to month values (for filtering month list)
const QUARTER_MONTHS: Record<string, string[]> = {
  Q1: ['04', '05', '06'],
  Q2: ['07', '08', '09'],
  Q3: ['10', '11', '12'],
  Q4: ['01', '02', '03'],
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
  selectedQuarters,
  selectedMonths,
  onFYChange,
  onQuarterChange,
  onMonthChange,
  compact = false,
  variant = 'default',
}: DashboardFiltersProps) => {
  const [showFYDropdown, setShowFYDropdown] = useState(false)
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const fyDropdownRef = useRef<HTMLDivElement>(null)
  const quarterDropdownRef = useRef<HTMLDivElement>(null)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  const prevFYCountRef = useRef<number | null>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fyDropdownRef.current && !fyDropdownRef.current.contains(event.target as Node)) {
        setShowFYDropdown(false)
      }
      if (quarterDropdownRef.current && !quarterDropdownRef.current.contains(event.target as Node)) {
        setShowQuarterDropdown(false)
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear quarter and month only when user actively changes FY from exactly one to not one.
  // Do NOT clear on initial mount or when restoring filters (e.g. navigating back to Projects).
  useEffect(() => {
    const currentCount = selectedFYs.length
    const prevCount = prevFYCountRef.current
    if (prevCount === 1 && currentCount !== 1) {
      onQuarterChange([])
      onMonthChange([])
    }
    prevFYCountRef.current = currentCount
  }, [selectedFYs, onQuarterChange, onMonthChange])

  // When quarter selection changes, keep only months that belong to selected quarter(s)
  useEffect(() => {
    if (selectedQuarters.length > 0 && selectedMonths.length > 0) {
      const allowedMonths = new Set(
        selectedQuarters.flatMap((q) => QUARTER_MONTHS[q] ?? [])
      )
      const validMonths = selectedMonths.filter((m) => allowedMonths.has(m))
      if (validMonths.length !== selectedMonths.length) {
        onMonthChange(validMonths)
      }
    }
  }, [selectedQuarters, selectedMonths, onMonthChange])

  const toggleFY = (fy: string) => {
    if (selectedFYs.includes(fy)) {
      onFYChange(selectedFYs.filter((f) => f !== fy))
    } else {
      onFYChange([...selectedFYs, fy])
    }
  }

  const toggleQuarter = (quarter: string) => {
    if (selectedQuarters.includes(quarter)) {
      onQuarterChange(selectedQuarters.filter((q) => q !== quarter))
    } else {
      onQuarterChange([...selectedQuarters, quarter])
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
    onQuarterChange([])
    onMonthChange([])
  }

  const clearQuarterFilter = () => {
    onQuarterChange([])
  }

  const clearMonthFilter = () => {
    onMonthChange([])
  }

  const isQuarterFilterDisabled = selectedFYs.length !== 1
  const isMonthFilterDisabled = selectedFYs.length !== 1

  // When quarter(s) selected, month dropdown only shows months in those quarters
  const visibleMonths =
    selectedQuarters.length > 0
      ? MONTHS.filter((m) =>
          selectedQuarters.some((q) => QUARTER_MONTHS[q]?.includes(m.value))
        )
      : MONTHS

  // Shared button base (compact reduces height/padding for dense filter panels)
  const btnBase = compact
    ? 'flex items-center justify-between min-w-0 px-3 py-2 min-h-[40px] text-[13px] border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-md transition-all duration-200 font-medium'
    : 'flex items-center justify-between min-w-0 px-3 py-2.5 min-h-[40px] text-[13px] sm:text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-md transition-all duration-200 font-medium'
  const dropdownPanel = variant === 'zenith'
    ? 'absolute z-20 left-0 right-0 mt-2 max-h-[70vh] w-full overflow-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] shadow-[var(--shadow-dropdown)] backdrop-blur-sm sm:right-auto sm:left-0 sm:max-h-60 sm:max-w-none sm:min-w-[220px] sm:w-auto max-w-[min(100vw,360px)]'
    : 'absolute z-20 mt-2 left-0 right-0 sm:right-auto sm:left-0 w-full sm:w-auto sm:min-w-[200px] max-w-[min(100vw,320px)] sm:max-w-none bg-white border-2 border-primary-200 rounded-xl shadow-2xl max-h-[70vh] sm:max-h-60 overflow-auto backdrop-blur-sm'
  const btnZenith = compact
    ? 'flex w-full min-w-0 items-center justify-between rounded-xl px-3 py-2 min-h-[40px] text-[13px] font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] active:scale-[0.99]'
    : 'flex w-full min-w-0 items-center justify-between rounded-xl px-3 py-2.5 min-h-[40px] text-[13px] font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] active:scale-[0.99] sm:text-sm'
  const optionLabel = variant === 'zenith'
    ? (compact
        ? 'flex min-h-[40px] cursor-pointer items-center rounded-lg px-3 py-2 transition-all duration-150 hover:bg-[color:var(--bg-table-hover)] touch-manipulation'
        : 'flex min-h-[44px] cursor-pointer items-center rounded-lg px-3 py-3 transition-all duration-200 hover:bg-[color:var(--bg-table-hover)] sm:py-2.5 touch-manipulation')
    : (compact
        ? 'flex items-center min-h-[40px] px-3 py-2 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 cursor-pointer rounded-lg transition-all duration-150 hover:shadow-sm touch-manipulation'
        : 'flex items-center min-h-[44px] px-3 py-3 sm:py-2.5 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 cursor-pointer rounded-lg transition-all duration-200 hover:shadow-sm touch-manipulation')
  
  // Dropdown wrapper: when compact, allow full expansion; otherwise constrain max-width
  const dropdownWrapper = compact
    ? 'relative w-full sm:w-auto sm:flex-1 flex flex-col'
    : 'relative w-full sm:w-auto sm:flex-1 sm:max-w-[200px] md:max-w-[220px] lg:max-w-[240px] flex flex-col'

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-start min-w-0 ${
        compact ? 'w-full gap-2 sm:gap-3 mb-0' : 'w-full max-w-full gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4'
      }`}
    >
      {/* FY Filter */}
      <div className={dropdownWrapper} ref={fyDropdownRef}>
        <button
          type="button"
          onClick={() => setShowFYDropdown(!showFYDropdown)}
          className={
            variant === 'zenith'
              ? `zenith-native-select ${btnZenith} w-full`
              : `${btnBase} border-primary-300 bg-gradient-to-r from-white to-primary-50 hover:from-primary-50 hover:to-primary-100 hover:border-primary-500 hover:shadow-xl active:scale-[0.99] sm:hover:-translate-y-0.5 text-gray-700 w-full`
          }
        >
          <span
            className={`truncate mr-2 ${
              variant === 'zenith' ? 'text-[color:var(--text-primary)]' : 'text-gray-700'
            }`}
          >
            {selectedFYs.length === 0
              ? 'Financial Years'
              : selectedFYs.length === 1
              ? selectedFYs[0]
              : `${selectedFYs.length} FYs selected`}
          </span>
          <svg
            className={`flex-shrink-0 h-4 w-4 ${variant === 'zenith' ? 'text-[color:var(--text-muted)]' : 'text-gray-500'} transition-transform ${showFYDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`${compact ? 'h-1' : variant === 'zenith' ? 'h-0.5' : 'h-5 sm:h-5'} mt-1`}>
          {/* Spacer for consistent height with other filters */}
        </div>
        {showFYDropdown && (
          <div className={dropdownPanel}>
            <div className="p-2">
              {availableFYs.length > 0 ? (
                <>
                  {availableFYs.map((fy) => (
                    <label key={fy} className={optionLabel}>
                      <input
                        type="checkbox"
                        checked={selectedFYs.includes(fy)}
                        onChange={() => toggleFY(fy)}
                        className={
                          variant === 'zenith'
                            ? 'mr-2 flex-shrink-0 rounded border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]'
                            : 'mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0'
                        }
                      />
                      <span className={`text-sm ${variant === 'zenith' ? 'text-[color:var(--text-primary)]' : 'text-gray-700'}`}>{fy}</span>
                    </label>
                  ))}
                  {selectedFYs.length > 0 && (
                    <button
                      onClick={clearFYFilter}
                      className={
                        variant === 'zenith'
                          ? 'mt-2 min-h-[44px] w-full touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-3 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all duration-200 hover:opacity-95 active:scale-[0.99] sm:min-h-0 sm:py-2'
                          : 'mt-2 min-h-[44px] w-full touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-3 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all duration-200 hover:opacity-95 active:scale-[0.99] sm:min-h-0 sm:py-2'
                      }
                    >
                      Clear Filter
                    </button>
                  )}
                </>
              ) : (
                <div className={`px-3 py-3 text-sm ${variant === 'zenith' ? 'text-[color:var(--text-muted)]' : 'text-gray-500'}`}>No FY data available</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quarter Filter - between FY and Month */}
      <div className={dropdownWrapper} ref={quarterDropdownRef}>
        <button
          type="button"
          onClick={() => !isQuarterFilterDisabled && setShowQuarterDropdown(!showQuarterDropdown)}
          disabled={isQuarterFilterDisabled}
          className={
            variant === 'zenith'
              ? isQuarterFilterDisabled
                ? 'flex w-full min-w-0 cursor-not-allowed items-center justify-between rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-3 py-2 min-h-[40px] text-[13px] text-[color:var(--text-muted)] sm:text-sm'
                : `zenith-native-select ${btnZenith} w-full`
              : `${btnBase} w-full ${
                  isQuarterFilterDisabled
                    ? 'cursor-not-allowed bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300 text-gray-400'
                    : 'border-primary-300 bg-gradient-to-r from-white to-primary-50 hover:from-primary-50 hover:to-primary-100 hover:border-primary-500 hover:shadow-xl text-gray-700 active:scale-[0.99] sm:hover:-translate-y-0.5'
                }`
          }
        >
          <span className={`truncate mr-2 ${variant === 'zenith' && !isQuarterFilterDisabled ? 'text-[color:var(--text-primary)]' : ''}`}>
            {selectedQuarters.length === 0
              ? 'Quarters'
              : selectedQuarters.length === 1
              ? selectedQuarters[0]
              : `${selectedQuarters.length} quarters selected`}
          </span>
          <svg
            className={`flex-shrink-0 h-4 w-4 transition-transform ${showQuarterDropdown ? 'rotate-180' : ''} ${
              isQuarterFilterDisabled
                ? variant === 'zenith'
                  ? 'text-[color:var(--text-muted)]'
                  : 'text-gray-400'
                : variant === 'zenith'
                  ? 'text-[color:var(--text-muted)]'
                  : 'text-gray-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`${compact ? 'h-1' : variant === 'zenith' ? 'h-0.5' : 'h-5 sm:h-5'} mt-1`}>
          {!compact && isQuarterFilterDisabled && (
            <p
              className={`hidden sm:block text-[11px] leading-tight ${
                variant === 'zenith' ? 'text-[color:var(--text-muted)]' : 'text-gray-500'
              }`}
            >
              Select 1 FY to enable quarter filter
            </p>
          )}
        </div>
        {!isQuarterFilterDisabled && showQuarterDropdown && (
          <div className={dropdownPanel}>
            <div className="p-2">
              {QUARTERS.map((quarter) => (
                <label key={quarter.value} className={optionLabel}>
                  <input
                    type="checkbox"
                    checked={selectedQuarters.includes(quarter.value)}
                    onChange={() => toggleQuarter(quarter.value)}
                    className={
                      variant === 'zenith'
                        ? 'mr-2 flex-shrink-0 rounded border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]'
                        : 'mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0'
                    }
                  />
                  <span className={`text-sm ${variant === 'zenith' ? 'text-[color:var(--text-primary)]' : 'text-gray-700'}`}>{quarter.label}</span>
                </label>
              ))}
              {selectedQuarters.length > 0 && (
                <button
                  onClick={clearQuarterFilter}
                  className={
                    variant === 'zenith'
                      ? 'mt-2 min-h-[44px] w-full touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-3 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all duration-200 hover:opacity-95 active:scale-[0.99] sm:min-h-0 sm:py-2'
                      : 'mt-2 min-h-[44px] w-full touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-3 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all duration-200 hover:opacity-95 active:scale-[0.99] sm:min-h-0 sm:py-2'
                  }
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Month Filter */}
      <div className={dropdownWrapper} ref={monthDropdownRef}>
        <button
          type="button"
          onClick={() => !isMonthFilterDisabled && setShowMonthDropdown(!showMonthDropdown)}
          disabled={isMonthFilterDisabled}
          className={
            variant === 'zenith'
              ? isMonthFilterDisabled
                ? 'flex w-full min-w-0 cursor-not-allowed items-center justify-between rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-3 py-2 min-h-[40px] text-[13px] text-[color:var(--text-muted)] sm:text-sm'
                : `zenith-native-select ${btnZenith} w-full`
              : `${btnBase} w-full ${
                  isMonthFilterDisabled
                    ? 'cursor-not-allowed bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300 text-gray-400'
                    : 'border-primary-300 bg-gradient-to-r from-white to-primary-50 hover:from-primary-50 hover:to-primary-100 hover:border-primary-500 hover:shadow-xl text-gray-700 active:scale-[0.99] sm:hover:-translate-y-0.5'
                }`
          }
        >
          <span
            className={`truncate mr-2 ${
              variant === 'zenith' && !isMonthFilterDisabled ? 'text-[color:var(--text-primary)]' : ''
            }`}
          >
            {selectedMonths.length === 0
              ? 'Months'
              : selectedMonths.length === 1
              ? MONTHS.find((m) => m.value === selectedMonths[0])?.label || selectedMonths[0]
              : `${selectedMonths.length} months selected`}
          </span>
          <svg
            className={`flex-shrink-0 h-4 w-4 transition-transform ${showMonthDropdown ? 'rotate-180' : ''} ${
              isMonthFilterDisabled
                ? variant === 'zenith'
                  ? 'text-[color:var(--text-muted)]'
                  : 'text-gray-400'
                : variant === 'zenith'
                  ? 'text-[color:var(--text-muted)]'
                  : 'text-gray-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`${compact ? 'h-1' : variant === 'zenith' ? 'h-0.5' : 'h-5 sm:h-5'} mt-1`}>
          {!compact && isMonthFilterDisabled && (
            <p
              className={`hidden sm:block text-[11px] leading-tight ${
                variant === 'zenith' ? 'text-[color:var(--text-muted)]' : 'text-gray-500'
              }`}
            >
              Select 1 FY to enable month filter
            </p>
          )}
          {!compact && !isMonthFilterDisabled && selectedQuarters.length > 0 && (
            <p
              className={`hidden sm:block text-[11px] leading-tight ${
                variant === 'zenith' ? 'text-[color:var(--text-muted)]' : 'text-gray-500'
              }`}
            >
              Month list respects selected quarter(s)
            </p>
          )}
        </div>
        {!isMonthFilterDisabled && showMonthDropdown && (
          <div className={dropdownPanel}>
            <div className="p-2">
              {visibleMonths.map((month) => (
                <label key={month.value} className={optionLabel}>
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(month.value)}
                    onChange={() => toggleMonth(month.value)}
                    className={
                      variant === 'zenith'
                        ? 'mr-2 flex-shrink-0 rounded border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]'
                        : 'mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0'
                    }
                  />
                  <span className={`text-sm ${variant === 'zenith' ? 'text-[color:var(--text-primary)]' : 'text-gray-700'}`}>{month.label}</span>
                </label>
              ))}
              {selectedMonths.length > 0 && (
                <button
                  onClick={clearMonthFilter}
                  className={
                    variant === 'zenith'
                      ? 'mt-2 min-h-[44px] w-full touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-3 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all duration-200 hover:opacity-95 active:scale-[0.99] sm:min-h-0 sm:py-2'
                      : 'mt-2 min-h-[44px] w-full touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-3 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all duration-200 hover:opacity-95 active:scale-[0.99] sm:min-h-0 sm:py-2'
                  }
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardFilters
