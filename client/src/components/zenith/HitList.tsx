import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Target, CheckCircle2 } from 'lucide-react'
import { UserRole } from '../../types'
import type { HitListItem, HitListLabel } from '../../hooks/useHitList'
import HealthBadge from './HealthBadge'
import { pipelineRowToHealthProject } from '../../utils/dealHealthScore'
import {
  formatZenithDealInrParts,
  zenithDealRowStagePillClass,
  zenithDealRowStagePillClassMobile,
  zenithLastActivityTone,
  ZENITH_DEAL_OPEN_BUTTON_CLASS,
} from './zenithDealCardUi'

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

function formatConfirmationShort(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd MMM yy')
  } catch {
    return '—'
  }
}

function hitListHealthProject(project: HitListItem) {
  return pipelineRowToHealthProject({
    stage: project.stage,
    updatedAt: project.updatedAt,
    dealValue: project.dealValue,
    expectedCloseDate: project.expectedCloseDate,
    confirmationDate: project.confirmationDate,
    advanceReceived: project.advanceReceived,
    leadSource: project.leadSource,
  })
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
        <div className="flex flex-col items-center justify-center gap-1 min-h-[64px] md:min-h-[52px] px-5 md:px-3.5 py-3 md:py-2 lg:min-h-0 lg:flex-1">
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
          <div className="zenith-scroll-x overflow-x-auto px-3 py-1 md:px-2 md:py-0">
            {/* Desktop / tablet — same columns as “Your pipeline today” + alert + confirmation */}
            <table className="hidden md:table w-full text-left text-[11px] sm:text-xs min-w-[820px]">
              <thead>
                <tr className="text-white/45 border-b border-white/10">
                  <th className="py-2 pr-2 font-semibold" style={{ fontFamily: 'var(--zenith-font-body)' }}>
                    Customer
                  </th>
                  <th className="py-2 pr-2 font-semibold" style={{ fontFamily: 'var(--zenith-font-body)' }}>
                    Stage
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold min-w-[6.5rem]"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                  >
                    Sales person
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold text-right"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                  >
                    Deal value
                  </th>
                  <th className="py-2 pr-2 font-semibold" style={{ fontFamily: 'var(--zenith-font-body)' }}>
                    Last activity
                  </th>
                  <th className="py-2 pr-2 font-semibold" style={{ fontFamily: 'var(--zenith-font-body)' }}>
                    Alert
                  </th>
                  <th className="py-2 pr-2 font-semibold" style={{ fontFamily: 'var(--zenith-font-body)' }}>
                    Confirmation
                  </th>
                  <th
                    className="py-2 font-semibold text-center w-[72px]"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                  >
                    Health
                  </th>
                  <th className="py-2 pl-1 w-[88px]" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {hitList.map((project, index) => {
                  const tone = zenithLastActivityTone(project.daysSinceActivity)
                  const lb = labelBadgeClass(project.label)
                  const sp = project.salespersonName
                  const dealParts = formatZenithDealInrParts(project.dealValue)
                  const spRow = zenithDealRowStagePillClass(project.stage)
                  return (
                    <motion.tr
                      key={project.id}
                      className="group border-b border-white/[0.06] hover:bg-white/[0.04]"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.25 }}
                    >
                      <td className="py-2.5 pr-2">
                        <span
                          className="text-white font-medium truncate max-w-[11rem] inline-block align-bottom"
                          title={project.customerName}
                          style={{ fontFamily: 'var(--zenith-font-body)' }}
                        >
                          {project.customerName}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className={spRow} style={{ fontFamily: 'var(--zenith-font-body)' }}>
                          {project.stage}
                        </span>
                      </td>
                      <td
                        className="py-2.5 pr-2 text-white/80 truncate max-w-[9rem]"
                        title={sp}
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {sp}
                      </td>
                      <td
                        className={`py-2.5 pr-2 text-right tabular-nums font-medium ${
                          dealParts.muted ? 'text-white/30' : 'text-[#F5A623]'
                        }`}
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {dealParts.text}
                      </td>
                      <td className="py-2.5 pr-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${tone.className} ${tone.text} ${
                            project.label === 'OVERDUE' ? 'pulse-number' : ''
                          }`}
                        >
                          {project.daysSinceActivity}d ago
                        </span>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span
                          className={`inline-flex items-center max-w-[8.5rem] rounded-[8px] px-1.5 py-px text-[9px] leading-tight ${lb.className}`}
                          style={{ fontFamily: 'var(--zenith-font-body)' }}
                          title={`${project.label}: ${project.daysNumber} ${project.daysSubLabel}`}
                        >
                          {lb.showPulse && <span className="pulse-dot shrink-0" aria-hidden />}
                          <span className="truncate">{project.label}</span>
                        </span>
                      </td>
                      <td
                        className="py-2.5 pr-2 text-white/70 tabular-nums whitespace-nowrap"
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {formatConfirmationShort(project.confirmationDate)}
                      </td>
                      <td className="py-2.5 text-center align-middle">
                        <HealthBadge project={hitListHealthProject(project)} size="sm" showLabel={false} />
                      </td>
                      <td className="py-2.5 pl-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (!onOpenDrawer) return
                            e.preventDefault()
                            e.stopPropagation()
                            onOpenDrawer({
                              id: project.id,
                              customerName: project.customerName,
                              stageLabel: project.stage,
                            })
                          }}
                          className={ZENITH_DEAL_OPEN_BUTTON_CLASS}
                          style={{ fontFamily: 'var(--zenith-font-body)' }}
                          aria-label={`Open quick actions for ${project.customerName}`}
                        >
                          Open →
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile — same data, no oversized day count column */}
            <div className="md:hidden divide-y divide-white/[0.06]">
              {hitList.map((project, index) => {
                const tone = zenithLastActivityTone(project.daysSinceActivity)
                const lb = labelBadgeClass(project.label)
                const dealParts = formatZenithDealInrParts(project.dealValue)
                const spMobile = zenithDealRowStagePillClassMobile(project.stage)
                return (
                  <motion.div
                    key={project.id}
                    className="group py-3.5 first:pt-2"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.25 }}
                    role="group"
                    aria-label={project.customerName}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="min-w-0 flex-1 truncate text-[15px] font-medium text-white"
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {project.customerName}
                      </p>
                      <span className={spMobile} style={{ fontFamily: 'var(--zenith-font-body)' }}>
                        {project.stage}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-[12px] text-white/60 truncate"
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                      title={project.salespersonName}
                    >
                      {project.salespersonName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p
                        className="text-[15px] font-medium tabular-nums"
                        style={{
                          fontFamily: 'var(--zenith-font-body)',
                          color: dealParts.muted ? 'rgba(255,255,255,0.3)' : '#F5A623',
                        }}
                      >
                        {dealParts.text}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${tone.className} ${tone.text}`}
                      >
                        {project.daysSinceActivity}d ago
                      </span>
                      <span
                        className={`inline-flex items-center rounded-[10px] px-2 py-0.5 text-[11px] ${lb.className}`}
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {lb.showPulse && <span className="pulse-dot mr-1" aria-hidden />}
                        {project.label}
                      </span>
                    </div>
                    <p
                      className="mt-1.5 text-[12px] text-white/50"
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                    >
                      Confirmation:{' '}
                      <span className="text-white/75 tabular-nums">
                        {formatConfirmationShort(project.confirmationDate)}
                      </span>
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <HealthBadge project={hitListHealthProject(project)} size="sm" showLabel={false} />
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!onOpenDrawer) return
                          e.preventDefault()
                          e.stopPropagation()
                          onOpenDrawer({
                            id: project.id,
                            customerName: project.customerName,
                            stageLabel: project.stage,
                          })
                        }}
                        className={ZENITH_DEAL_OPEN_BUTTON_CLASS}
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                        aria-label={`Open quick actions for ${project.customerName}`}
                      >
                        Open →
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
