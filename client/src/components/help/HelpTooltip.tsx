import { useState, useRef, useEffect } from 'react'
import { getHelpTooltip } from '../../help/tooltips'

interface HelpTooltipProps {
  helpKey: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const HelpTooltip = ({ helpKey, position = 'top', className = '' }: HelpTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const tooltip = getHelpTooltip(helpKey)

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = triggerRect.top + scrollY - tooltipRect.height - 8
          left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'bottom':
          top = triggerRect.bottom + scrollY + 8
          left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'left':
          top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.left + scrollX - tooltipRect.width - 8
          break
        case 'right':
          top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.right + scrollX + 8
          break
      }

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (left < 10) left = 10
      if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10
      }
      if (top < 10) top = 10
      if (top + tooltipRect.height > viewportHeight + scrollY - 10) {
        top = viewportHeight + scrollY - tooltipRect.height - 10
      }

      setTooltipPosition({ top, left })
    }
  }, [isVisible, position])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isVisible])

  if (!tooltip) {
    return null
  }

  return (
    <span className={`inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center justify-center w-4 h-4 xl:w-5 xl:h-5 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-colors cursor-help"
        aria-label={`Help: ${tooltip.title}`}
      >
        <svg
          className="w-2.5 h-2.5 xl:w-3 xl:h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-64 p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="font-semibold text-gray-900 mb-1">{tooltip.title}</div>
          <div className="text-gray-600 leading-relaxed">{tooltip.content}</div>
          
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-white border border-gray-200 transform rotate-45 ${
              position === 'top'
                ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-0 border-l-0'
                : position === 'bottom'
                ? 'top-[-4px] left-1/2 -translate-x-1/2 border-b-0 border-r-0'
                : position === 'left'
                ? 'right-[-4px] top-1/2 -translate-y-1/2 border-l-0 border-b-0'
                : 'left-[-4px] top-1/2 -translate-y-1/2 border-r-0 border-t-0'
            }`}
          />
        </div>
      )}
    </span>
  )
}

export default HelpTooltip
