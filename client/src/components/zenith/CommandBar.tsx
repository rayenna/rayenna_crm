import { useEffect, useState } from 'react'
import { Binoculars } from 'lucide-react'
import ZenithFilterSegments from './ZenithFilterSegments'

interface Props {
  availableFYs: string[]
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  onFYChange: (fys: string[]) => void
  onQuarterChange: (q: string[]) => void
  onMonthChange: (m: string[]) => void
  onResetFilters: () => void
  onShowBriefing?: () => void
}

export default function CommandBar({
  availableFYs,
  selectedFYs,
  selectedQuarters,
  selectedMonths,
  onFYChange,
  onQuarterChange,
  onMonthChange,
  onResetFilters,
  onShowBriefing,
}: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [lastFetched, setLastFetched] = useState(() => new Date())

  useEffect(() => {
    setLastFetched(new Date())
    setSecondsAgo(0)
  }, [selectedFYs.join('|'), selectedQuarters.join('|'), selectedMonths.join('|')])

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date().getTime() - lastFetched.getTime()) / 1000)
      setSecondsAgo(diff)
    }, 1000)
    return () => clearInterval(interval)
  }, [lastFetched])

  const timeLabel = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#0a0a0f]/85 backdrop-blur-xl">
      <div className="zenith-exec-main mx-auto px-3 sm:px-5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top,0px))] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <Binoculars className="w-5 h-5 sm:w-6 sm:h-6 text-[#f5a623] flex-shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate font-sans">
              Zenith
            </h1>
            <p className="mt-0 text-white/55 text-[11px] sm:text-xs font-sans font-medium tracking-wide uppercase">
              Command Center
            </p>
          </div>
        </div>

        <ZenithFilterSegments
          availableFYs={availableFYs}
          selectedFYs={selectedFYs}
          selectedQuarters={selectedQuarters}
          selectedMonths={selectedMonths}
          onFYChange={onFYChange}
          onQuarterChange={onQuarterChange}
          onMonthChange={onMonthChange}
          onResetAll={onResetFilters}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          {onShowBriefing ? (
            <button
              type="button"
              onClick={onShowBriefing}
              title="Open Daily Briefing"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(245,166,35,0.1)',
                border: '1px solid rgba(245,166,35,0.25)',
                borderRadius: '20px',
                padding: '4px 12px',
                color: '#F5A623',
                fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(245,166,35,0.2)'
                e.currentTarget.style.borderColor = 'rgba(245,166,35,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(245,166,35,0.1)'
                e.currentTarget.style.borderColor = 'rgba(245,166,35,0.25)'
              }}
            >
              ✦ Briefing
            </button>
          ) : null}
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#00D4B4',
              display: 'inline-block',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }}
          />
          Live · {timeLabel}
        </div>
      </div>
    </header>
  )
}
