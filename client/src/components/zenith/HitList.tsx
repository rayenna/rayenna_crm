import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { Target, CheckCircle2 } from 'lucide-react'
import { UserRole } from '../../types'
import type { HitListItem, HitListLabel } from '../../hooks/useHitList'
import HealthBadge from './HealthBadge'
import { hitListItemToHealthProject } from '../../utils/dealHealthScore'

function stagePillClass(stage: string): string {
  const s = stage.trim()
  if (s === 'Lead') return 'bg-[rgba(56,139,255,0.15)] text-[#3B8BFF]'
  if (s === 'Site Survey') return 'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]'
  if (s === 'Proposal') return 'bg-[rgba(245,166,35,0.15)] text-[#F5A623]'
  if (s === 'Confirmed Order') return 'bg-[rgba(0,212,180,0.15)] text-[#00D4B4]'
  return 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]'
}

function labelBadgeClass(label: HitListLabel): { className: string; showPulse: boolean } {
  switch (label) {
    case 'OVERDUE':
      return { className: 'bg-[rgba(255,71,87,0.2)] text-[#FF4757]', showPulse: true }
    case 'CLOSING SOON':
      return { className: 'bg-[rgba(255,107,107,0.15)] text-[#FF6B6B]', showPulse: false }
    case 'STALLED':
      return { className: 'bg-[rgba(245,166,35,0.15)] text-[#F5A623]', showPulse: false }
    case 'NUDGE NEEDED':
      return { className: 'bg-[rgba(245,166,35,0.12)] text-[#F5A623]', showPulse: false }
    case 'GOING COLD':
      return { className: 'bg-[rgba(150,150,150,0.15)] text-[#999]', showPulse: false }
    default:
      return { className: 'bg-[rgba(150,150,150,0.15)] text-[#999]', showPulse: false }
  }
}

function formatDealValue(v: number | null | undefined): string {
  if (v == null || v === 0) return '—'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)
}

const cardBase: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  padding: 0,
}

export default function HitList({
  hitList,
  totalAtRisk,
  allClear,
  role,
  onOpenDrawer,
}: {
  hitList: HitListItem[]
  totalAtRisk: string
  allClear: boolean
  role: UserRole
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }) => void
}) {
  const n = hitList.length
  const isSales = role === UserRole.SALES
  const subtitle = isSales
    ? `${n} deal${n === 1 ? '' : 's'} need your attention`
    : `${n} deal${n === 1 ? '' : 's'} across your team need attention`

  const borderLeft = allClear ? '3px solid #00D4B4' : '3px solid #FF4757'

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="zenith-hit-list flex h-full min-h-0 w-full flex-col overflow-hidden mb-5 md:mb-6 lg:mb-0 rounded-xl ring-1 ring-white/[0.06] shadow-sm shadow-black/20 md:shadow-md md:shadow-black/25"
      style={{ ...cardBase, borderLeft }}
    >
      <div
        className="flex shrink-0 flex-wrap items-start justify-between gap-2 md:gap-2 px-5 py-4 md:px-3.5 md:py-2.5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="min-w-0 flex gap-2.5 md:gap-2">
          <Target
            className="shrink-0 mt-0.5 w-[18px] h-[18px] md:w-4 md:h-4"
            strokeWidth={2}
            color="#F5A623"
            aria-hidden
          />
          <div>
            <h2
              className="zenith-hit-list-title text-[18px] md:text-[15px] font-bold text-white leading-tight"
              style={{ fontFamily: "'Syne', var(--zenith-font-display), system-ui, sans-serif" }}
            >
              Today&apos;s Hit List
            </h2>
            <p
              className="mt-1 md:mt-0.5 text-[13px] md:text-[11px] text-white/50 leading-snug"
              style={{ fontFamily: 'var(--zenith-font-body)' }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        {!allClear && (
          <span
            className="shrink-0 rounded-[20px] px-3 py-1 md:px-2 md:py-0.5 text-[13px] md:text-[11px] font-medium"
            style={{
              background: 'rgba(255, 71, 87, 0.15)',
              border: '1px solid #FF4757',
              color: '#FF4757',
              fontFamily: 'var(--zenith-font-body)',
            }}
          >
            {totalAtRisk} at Risk
          </span>
        )}
      </div>

      {allClear ? (
        <div
          className="flex flex-col items-center justify-center gap-1 min-h-[64px] md:min-h-[52px] px-5 md:px-3.5 py-3 md:py-2 lg:min-h-0 lg:flex-1"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-[18px] h-[18px] md:w-4 md:h-4 shrink-0" color="#00D4B4" aria-hidden />
            <span
              className="text-[14px] md:text-[12px] text-center"
              style={{ color: '#00D4B4', fontFamily: 'var(--zenith-font-body)' }}
            >
              All clear — no urgent deals today
            </span>
          </div>
          <p
            className="text-[12px] md:text-[10px] text-white/35"
            style={{ fontFamily: 'var(--zenith-font-body)' }}
          >
            Check back tomorrow
          </p>
        </div>
      ) : (
        <div className="zenith-hit-list-body w-full min-h-[8rem] max-h-[min(42vh,320px)] overflow-y-auto overscroll-y-contain sm:max-h-[min(44vh,340px)] lg:min-h-0 lg:max-h-none lg:flex-1">
          {hitList.map((project, index) => {
            const crit = project.urgency === 'critical'
            const numColor = crit ? '#FF4757' : '#F5A623'
            const lb = labelBadgeClass(project.label)
            const sp = stagePillClass(project.stage)

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
              >
                <div
                  className="group border-b border-white/[0.06] last:border-b-0 transition-colors duration-200 ease-out hover:bg-white/[0.04] px-5 py-3.5 md:py-2 md:px-3"
                  role="group"
                  aria-label={project.customerName}
                >
                {/* Desktop / tablet — compact widget row */}
                <div className="hidden md:flex md:items-center md:gap-2">
                  <div className="min-w-0 flex-[2]">
                    <p
                      className="truncate text-[13px] font-medium text-white leading-tight"
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                    >
                      {project.customerName}
                    </p>
                    <span
                      className={`mt-0.5 inline-block rounded-[8px] px-1.5 py-px text-[10px] leading-tight ${sp}`}
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                    >
                      {project.stage}
                    </span>
                  </div>

                  <div className="min-w-0 flex-[1.35] text-right">
                    <p
                      className="text-[12px] font-medium tabular-nums leading-tight"
                      style={{
                        fontFamily: 'var(--zenith-font-body)',
                        color:
                          project.dealValue == null || project.dealValue === 0
                            ? 'rgba(255,255,255,0.3)'
                            : '#F5A623',
                      }}
                    >
                      {project.dealValue == null || project.dealValue === 0
                        ? '—'
                        : `₹${formatDealValue(project.dealValue)}`}
                    </p>
                    <div className="mt-0.5 flex justify-end">
                      <span
                        className={`inline-flex items-center max-w-full rounded-[8px] px-1.5 py-px text-[9px] leading-tight ${lb.className}`}
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {lb.showPulse && <span className="pulse-dot" aria-hidden />}
                        <span className="truncate">{project.label}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-center px-0.5">
                    <HealthBadge project={hitListItemToHealthProject(project)} size="sm" showLabel={false} />
                  </div>

                  <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center text-center">
                    <span
                      className={`text-[1.375rem] font-bold tabular-nums leading-none ${project.label === 'OVERDUE' ? 'pulse-number' : ''}`}
                      style={{ color: numColor, fontFamily: 'var(--zenith-font-body)' }}
                    >
                      {project.daysNumber}
                    </span>
                    <span
                      className="mt-0.5 max-w-full text-[8px] leading-[1.15] line-clamp-2 break-words hyphens-auto px-0.5"
                      style={{
                        color:
                          crit ? 'rgba(255, 71, 87, 0.7)' : 'rgba(245, 166, 35, 0.7)',
                        fontFamily: 'var(--zenith-font-body)',
                      }}
                    >
                      {project.daysSubLabel}
                    </span>
                  </div>

                  <div className="ml-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (!onOpenDrawer) return
                        e.preventDefault()
                        e.stopPropagation()
                        onOpenDrawer({ id: project.id, customerName: project.customerName, stageLabel: project.stage })
                      }}
                      className="inline-block rounded-md border border-white/20 bg-transparent px-2 py-1 text-[10px] text-white/70 transition-all duration-200 ease-out group-hover:border-[#F5A623] group-hover:bg-[rgba(245,166,35,0.08)] group-hover:text-[#F5A623] whitespace-nowrap"
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                      aria-label={`Open quick actions for ${project.customerName}`}
                    >
                      Open →
                    </button>
                  </div>
                </div>

                {/* Mobile <768px */}
                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="min-w-0 flex-1 truncate text-[15px] font-medium text-white"
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                    >
                      {project.customerName}
                    </p>
                    <span
                      className={`shrink-0 rounded-[10px] px-2 py-0.5 text-[11px] ${sp}`}
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                    >
                      {project.stage}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-[15px] font-medium tabular-nums"
                      style={{
                        fontFamily: 'var(--zenith-font-body)',
                        color:
                          project.dealValue == null || project.dealValue === 0
                            ? 'rgba(255,255,255,0.3)'
                            : '#F5A623',
                      }}
                    >
                      {project.dealValue == null || project.dealValue === 0
                        ? '—'
                        : `₹${formatDealValue(project.dealValue)}`}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-[10px] px-2 py-0.5 text-[11px] ${lb.className}`}
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                    >
                      {lb.showPulse && <span className="pulse-dot" aria-hidden />}
                      {project.label}
                    </span>
                  </div>
                  <div className="flex justify-center py-1">
                    <HealthBadge project={hitListItemToHealthProject(project)} size="sm" showLabel={false} />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (!onOpenDrawer) return
                      e.preventDefault()
                      e.stopPropagation()
                      onOpenDrawer({ id: project.id, customerName: project.customerName, stageLabel: project.stage })
                    }}
                    className="block w-full rounded-lg border border-white/20 bg-transparent py-1.5 text-center text-[13px] text-white/70 transition-all duration-200 ease-out group-hover:border-[#F5A623] group-hover:bg-[rgba(245,166,35,0.08)] group-hover:text-[#F5A623]"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    aria-label={`Open quick actions for ${project.customerName}`}
                  >
                    Open quick actions →
                  </button>
                </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
