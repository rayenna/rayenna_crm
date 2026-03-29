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
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Binoculars className="w-6 h-6 sm:w-7 sm:h-7 text-[#f5a623] flex-shrink-0" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow truncate font-sans">
              Zenith
            </h1>
            <p className="mt-0.5 text-white/90 text-sm sm:text-base font-sans font-normal">
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
