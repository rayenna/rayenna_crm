import { Binoculars } from 'lucide-react'
import type { User } from '../../types'
import ZenithFilterSegments from './ZenithFilterSegments'

interface Props {
  user: User | null
  availableFYs: string[]
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  onFYChange: (fys: string[]) => void
  onQuarterChange: (q: string[]) => void
  onMonthChange: (m: string[]) => void
  onResetFilters: () => void
  /** ms epoch from React Query dataUpdatedAt */
  dataUpdatedAt?: number
}

function formatAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function initials(u: User | null): string {
  if (!u?.name) return '?'
  const p = u.name.trim().split(/\s+/)
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase()
}

export default function CommandBar({
  user,
  availableFYs,
  selectedFYs,
  selectedQuarters,
  selectedMonths,
  onFYChange,
  onQuarterChange,
  onMonthChange,
  onResetFilters,
  dataUpdatedAt,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/CRM_Logo.jpg" alt="" className="h-9 w-auto rounded-lg opacity-90 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <Binoculars className="w-6 h-6 text-[#f5a623] flex-shrink-0" strokeWidth={2} />
            <div className="min-w-0">
              <p className="zenith-display text-lg sm:text-xl font-bold text-white truncate">
                Zenith
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5a623]/80">Command Center</p>
            </div>
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

        <div className="flex items-center justify-center lg:justify-end gap-3 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border border-white/15 text-white/70 bg-white/5">
            {user?.role ?? '—'}
          </span>
          <span className="text-[11px] text-[#00d4b4] font-medium tabular-nums">
            Live
            {dataUpdatedAt ? (
              <span className="text-white/45"> · {formatAgo(dataUpdatedAt)}</span>
            ) : null}
          </span>
          <div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f5a623] to-[#00d4b4]/50 flex items-center justify-center text-xs font-extrabold text-[#0a0a0f]"
            title={user?.name ?? ''}
          >
            {initials(user)}
          </div>
        </div>
      </div>
    </header>
  )
}
