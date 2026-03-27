import { ReactNode } from 'react'
import { FaBolt } from 'react-icons/fa'

interface QuickAccessSectionProps {
  children: ReactNode
}

export default function QuickAccessSection({ children }: QuickAccessSectionProps) {
  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600 text-white shadow-sm">
          <FaBolt className="w-4 h-4" aria-hidden />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Quick Access
          </h2>
          <p className="text-xs text-slate-500">Jump to filtered project views</p>
        </div>
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </section>
  )
}
