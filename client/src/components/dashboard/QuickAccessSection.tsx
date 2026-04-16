import { ReactNode } from 'react'
import { FaBolt } from 'react-icons/fa'

interface QuickAccessSectionProps {
  children: ReactNode
  variant?: 'default' | 'zenith'
}

export default function QuickAccessSection({ children, variant = 'default' }: QuickAccessSectionProps) {
  const isZenith = variant === 'zenith'
  return (
    <section
      className={
        isZenith
          ? 'relative rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5'
          : 'relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm'
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className={
            isZenith
              ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] shadow-sm'
              : 'flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600 text-white shadow-sm'
          }
        >
          <FaBolt className="w-4 h-4" aria-hidden />
        </div>
        <div>
          <h2
            className={`text-base font-bold sm:text-lg ${isZenith ? 'text-[color:var(--text-primary)]' : 'text-slate-900'}`}
          >
            Quick Access
          </h2>
          <p className={`text-xs ${isZenith ? 'text-[color:var(--text-muted)]' : 'text-slate-500'}`}>
            Jump to filtered project views
          </p>
        </div>
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </section>
  )
}
