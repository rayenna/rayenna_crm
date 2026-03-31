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
}: Props) {
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
      </div>
    </header>
  )
}
