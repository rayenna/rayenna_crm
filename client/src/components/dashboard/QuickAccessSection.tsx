import { ReactNode } from 'react'
import { FaBolt } from 'react-icons/fa'

interface QuickAccessSectionProps {
  children: ReactNode
}

export default function QuickAccessSection({ children }: QuickAccessSectionProps) {
  return (
    <section className="relative rounded-2xl border-2 border-primary-100/80 bg-gradient-to-br from-primary-50/40 via-white to-amber-50/30 p-4 sm:p-5 shadow-lg shadow-primary-900/5 ring-1 ring-primary-200/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md">
          <FaBolt className="w-4 h-4" aria-hidden />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 bg-clip-text text-transparent">
            Quick Access
          </h2>
          <p className="text-xs text-gray-500">Jump to filtered project views</p>
        </div>
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </section>
  )
}
