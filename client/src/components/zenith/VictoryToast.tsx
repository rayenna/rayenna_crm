import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProjectStatus } from '../../types'
import type { VictoryToastDetail } from '../../hooks/useVictoryToast'
import { useIsMobile } from '../../hooks/useIsMobile'

const DOTS = [
  { top: '10%', left: '15%', color: '#F5A623', delay: '0s' },
  { top: '8%', left: '70%', color: '#00D4B4', delay: '0.1s' },
  { top: '20%', left: '88%', color: '#8B5CF6', delay: '0.05s' },
  { top: '12%', left: '40%', color: '#FF6B6B', delay: '0.15s' },
  { top: '5%', left: '55%', color: '#F5A623', delay: '0.08s' },
  { top: '18%', left: '25%', color: '#00D4B4', delay: '0.12s' },
] as const

function useCountUp(target: number, duration = 1000): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) {
      setVal(0)
      return
    }
    let start: number | null = null
    let raf = 0
    const step = (ts: number) => {
      if (start == null) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - (1 - p) ** 3
      setVal(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

function isGoldStage(stage: string): boolean {
  return stage === ProjectStatus.CONFIRMED || stage === ProjectStatus.UNDER_INSTALLATION
}

function headlineForStage(stage: string): string {
  return isGoldStage(stage) ? 'Deal Confirmed!' : 'Installation Complete!'
}

type Props = {
  toast: VictoryToastDetail | null
  onDismiss: () => void
}

export default function VictoryToast({ toast, onDismiss }: Props) {
  const isMobile = useIsMobile()
  const displayValue = useCountUp(toast?.dealValue ?? 0, 1000)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(onDismiss, 6000)
    return () => window.clearTimeout(t)
  }, [toast?.id, onDismiss])

  const containerStyle: CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 12,
        left: 12,
        right: 12,
        width: 'auto',
        zIndex: 1100,
        pointerEvents: 'none',
      }
    : {
        position: 'fixed',
        bottom: 28,
        right: 28,
        width: 320,
        zIndex: 1100,
        pointerEvents: 'none',
      }

  const borderColor = toast
    ? isGoldStage(toast.stage)
      ? 'rgba(245,166,35,0.45)'
      : 'rgba(0,212,180,0.45)'
    : 'rgba(255,255,255,0.1)'

  const accent = toast ? (isGoldStage(toast.stage) ? '#F5A623' : '#00D4B4') : '#F5A623'

  return (
    <div style={containerStyle} aria-live="polite">
      <AnimatePresence mode="wait">
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 32, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="relative overflow-hidden rounded-[14px] border"
              style={{
                background: '#0F0F1A',
                borderColor,
                padding: '18px 18px 0',
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 zenith-victory-shimmer"
                aria-hidden
              />
              {DOTS.map((d, i) => (
                <span
                  key={i}
                  className="pointer-events-none absolute zenith-victory-confetti-dot"
                  style={{
                    top: d.top,
                    left: d.left,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: d.color,
                    animationDelay: d.delay,
                  }}
                  aria-hidden
                />
              ))}

              <div className="relative z-[1] flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-2xl" aria-hidden>
                    🏆
                  </div>
                  <div
                    className="mt-0.5 text-base font-bold tracking-tight"
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      color: accent,
                    }}
                  >
                    {headlineForStage(toast.stage)}
                  </div>
                  <div className="mt-0.5 text-xs text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    by {toast.closedBy}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>

              <div className="relative z-[1] mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <div className="text-[15px] font-semibold text-white">{toast.customerName}</div>
                <div
                  className="mt-1 text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "'Syne', sans-serif", color: accent }}
                >
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  }).format(displayValue)}
                </div>
              </div>

              <div
                className="relative z-[1] mt-3.5 -mx-[18px] h-[3px] overflow-hidden rounded-b-[14px] bg-white/[0.07]"
              >
                <div
                  className="zenith-victory-countdown-bar h-full rounded-b-[inherit]"
                  style={{ background: accent }}
                  aria-hidden
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
