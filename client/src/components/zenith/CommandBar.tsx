import { useEffect, useState } from 'react'
import { Binoculars } from 'lucide-react'
import ZenithFilterSegments from './ZenithFilterSegments'
import ZenithFilterMobileRow from './ZenithFilterMobileRow'

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

  const fyKey = selectedFYs.join('|')
  const qKey = selectedQuarters.join('|')
  const mKey = selectedMonths.join('|')

  useEffect(() => {
    setLastFetched(new Date())
    setSecondsAgo(0)
  }, [fyKey, qKey, mKey])

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

  const briefingAndLive = (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 text-[10px] sm:text-[11px] text-white/35 font-sans">
      {onShowBriefing ? (
        <button
          type="button"
          onClick={onShowBriefing}
          title="Open Daily Briefing"
          className="inline-flex items-center gap-1 rounded-full border border-[#f5a623]/25 bg-[#f5a623]/10 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-[#f5a623] cursor-pointer transition-all duration-200 touch-manipulation hover:bg-[#f5a623]/20 hover:border-[#f5a623]/50"
        >
          ✦ Briefing
        </button>
      ) : null}
      <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
        <span className="zenith-command-live-dot inline-block align-middle" aria-hidden />
        <span>Live · {timeLabel}</span>
      </span>
    </div>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#0a0a0f]/85 backdrop-blur-xl">
      <div
        className="zenith-exec-main mx-auto px-3 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-2 sm:pb-2.5 grid grid-cols-[1fr_auto] lg:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-1.5 lg:gap-x-4 lg:gap-y-0 lg:items-center"
      >
        <div className="flex items-center gap-2.5 min-w-0 col-start-1 row-start-1 self-center">
          <Binoculars className="w-5 h-5 sm:w-6 sm:h-6 text-[#f5a623] flex-shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate font-sans leading-tight">
              Zenith
            </h1>
            <p className="mt-0 text-white/55 text-[10px] sm:text-xs font-sans font-medium tracking-wide uppercase leading-tight">
              Command Center
            </p>
          </div>
        </div>

        <div className="col-start-2 row-start-1 justify-self-end self-center lg:col-start-3 lg:row-start-1">
          {briefingAndLive}
        </div>

        <div className="col-span-2 col-start-1 row-start-2 min-w-0 w-full flex justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:px-2">
          <div className="lg:hidden w-full max-w-lg mx-auto">
            <ZenithFilterMobileRow
              availableFYs={availableFYs}
              selectedFYs={selectedFYs}
              selectedQuarters={selectedQuarters}
              selectedMonths={selectedMonths}
              onFYChange={onFYChange}
              onQuarterChange={onQuarterChange}
              onMonthChange={onMonthChange}
              onResetAll={onResetFilters}
            />
          </div>
          <div className="hidden lg:block w-full max-w-3xl mx-auto">
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
          </div>
        </div>
      </div>
    </header>
  )
}
