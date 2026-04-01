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
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      const diff = Math.floor((new Date().getTime() - lastFetched.getTime()) / 1000)
      setSecondsAgo(diff)
    }
    const interval = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
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

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 w-full min-w-0 lg:w-auto lg:justify-end text-[11px] text-white/35 font-sans">
          {onShowBriefing ? (
            <button
              type="button"
              onClick={onShowBriefing}
              title="Open Daily Briefing"
              className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 rounded-full border border-[#f5a623]/25 bg-[#f5a623]/10 px-3 py-2 sm:py-1.5 text-xs font-semibold text-[#f5a623] cursor-pointer transition-all duration-200 touch-manipulation hover:bg-[#f5a623]/20 hover:border-[#f5a623]/50"
            >
              ✦ Briefing
            </button>
          ) : null}
          <span className="inline-flex items-center gap-1.5 shrink-0 min-h-[44px] sm:min-h-0">
            <span className="zenith-command-live-dot inline-block align-middle" aria-hidden />
            <span>Live · {timeLabel}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
