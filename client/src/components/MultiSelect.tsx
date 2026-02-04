import { useState, useRef, useEffect } from 'react'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
  /** Smaller padding/height for dense filter panels (e.g. Projects). */
  compact?: boolean
  /** When true, show all selected labels on one line (e.g. "Name1, Name2") instead of "N selected". */
  showSelectedLabels?: boolean
  /** When provided and multiple values selected, use this label instead of "N selected". */
  multiSelectedLabel?: string
}

const MultiSelect = ({ options, selectedValues, onChange, placeholder = 'Select...', className = '', compact = false, showSelectedLabels: showLabels = false, multiSelectedLabel }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const displayText = selectedValues.length === 0
    ? placeholder
    : selectedValues.length === 1
    ? options.find(opt => opt.value === selectedValues[0])?.label || selectedValues[0]
    : showLabels
    ? selectedValues.map(v => options.find(opt => opt.value === v)?.label || v).join(', ')
    : multiSelectedLabel ?? `${selectedValues.length} selected`

  // Match DashboardFilters look & feel (rounded-xl, border-2, subtle gradient, shadow)
  const btnBase = compact
    ? 'w-full flex items-center justify-between min-w-0 px-3 py-2 min-h-[40px] text-[13px] border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-md transition-all duration-200 font-medium'
    : 'w-full flex items-center justify-between min-w-0 px-4 py-3 min-h-[44px] text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-lg transition-all duration-300 font-medium'
  const dropdownPanel =
    'absolute z-20 mt-2 left-0 right-0 w-full bg-white border-2 border-primary-200 rounded-xl shadow-2xl max-h-[70vh] sm:max-h-60 overflow-auto backdrop-blur-sm'
  const optionLabel = compact
    ? 'flex items-center min-h-[40px] px-3 py-2 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 cursor-pointer rounded-lg transition-all duration-150 hover:shadow-sm touch-manipulation'
    : 'flex items-center min-h-[44px] px-3 py-3 sm:py-2.5 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 cursor-pointer rounded-lg transition-all duration-200 hover:shadow-sm touch-manipulation'

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${btnBase} border-primary-300 bg-gradient-to-r from-white to-primary-50 hover:from-primary-50 hover:to-primary-100 hover:border-primary-500 hover:shadow-xl active:scale-[0.99] text-gray-700`}
      >
        <span className={`${selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-700'} whitespace-nowrap mr-2 min-w-0 overflow-hidden text-ellipsis`} title={displayText}>{displayText}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Clear all"
            >
              ✕
            </button>
          )}
          <svg
            className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className={dropdownPanel}>
          <div className="p-2">
            {options.map((option) => (
              <label
                key={option.value}
                className={optionLabel}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiSelect
