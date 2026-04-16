import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const ACCENTS = {
  gold: 'var(--accent-gold)',
  teal: 'var(--accent-teal)',
  sky: 'var(--accent-blue)',
} as const

export type ZenithFocusAccent = keyof typeof ACCENTS

type Props = {
  id?: string
  title: string
  accent: ZenithFocusAccent
  children: ReactNode
  /** Your Focus sub-panels start collapsed to reduce clutter */
  defaultOpen?: boolean
  subtitle?: string
}

export default function ZenithFocusCollapsible({
  id,
  title,
  accent,
  children,
  defaultOpen = false,
  subtitle,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const borderColor = ACCENTS[accent]

  return (
    <div
      id={id}
      className="zenith-focus-panel w-full min-w-0 scroll-mt-24"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <button
        type="button"
        className="zenith-focus-panel__head w-full text-left border-0 cursor-pointer px-4 py-3 flex items-center justify-between gap-2"
        style={{ userSelect: 'none' }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="min-w-0 flex flex-col gap-0.5 text-left">
          {/* Match ChartPanel chart titles (e.g. Projects by stage) */}
          <span className="zenith-display text-sm sm:text-[15px] font-semibold text-[color:var(--text-primary)] tracking-tight">
            {title}
          </span>
          {subtitle ? (
            <span
              className="text-[11px] text-[color:var(--text-muted)] leading-snug"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={14}
          className="text-[color:var(--text-muted)] transition-transform duration-300 shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="overflow-hidden border-t border-[color:var(--border-default)]"
      >
        {children}
      </motion.div>
    </div>
  )
}
