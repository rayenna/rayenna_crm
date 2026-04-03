import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const ACCENTS = {
  gold: '#F5A623',
  teal: '#00D4B4',
  sky: '#38bdf8',
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
      className="w-full min-w-0 scroll-mt-24"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '0 12px 12px 0',
        overflow: 'hidden',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <button
        type="button"
        className="w-full text-left border-0 cursor-pointer"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: 'rgba(255,255,255,0.02)',
          userSelect: 'none',
        }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="min-w-0 flex flex-col gap-0.5 text-left">
          {/* Match ChartPanel chart titles (e.g. Projects by stage) */}
          <span className="zenith-display text-sm sm:text-[15px] font-semibold text-white/95 tracking-tight">
            {title}
          </span>
          {subtitle ? (
            <span className="text-[11px] text-white/45 leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={14}
          className="text-white/30 transition-transform duration-300 shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {children}
      </motion.div>
    </div>
  )
}
