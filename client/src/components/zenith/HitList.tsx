import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Target, CheckCircle2 } from 'lucide-react'
import { UserRole } from '../../types'
import type { HitListItem, HitListLabel } from '../../hooks/useHitList'
import HealthBadge from './HealthBadge'
import { computeDealHealth, pipelineRowToHealthProject } from '../../utils/dealHealthScore'
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
      return { className: 'bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]', showPulse: true }
    case 'CLOSING SOON':
      return { className: 'bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]', showPulse: false }
    case 'STALLED':
      return { className: 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]', showPulse: false }
    case 'NUDGE NEEDED':
      return { className: 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]', showPulse: false }
    case 'GOING COLD':
      return { className: 'bg-[color:var(--bg-badge)] text-[color:var(--text-muted)]', showPulse: false }
    default:
      return { className: 'bg-[color:var(--bg-badge)] text-[color:var(--text-muted)]', showPulse: false }
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

type HitListSortField =
  | 'customerName'
  | 'stage'
  | 'salespersonName'
  | 'dealValue'
  | 'lastActivity'
  | 'alert'
  | 'confirmation'
  | 'health'
  | null

function confirmationSortTime(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY
  try {
    return parseISO(iso).getTime()
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

const cardBase: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-card)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
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
  const [sortField, setSortField] = useState<HitListSortField>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('ALL')
  const [customerFilter, setCustomerFilter] = useState<string>('')

  const salesPersonOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const r of hitList) {
      const n = (r.salespersonName ?? '').trim() || 'Unassigned'
      labels.add(n)
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b))
  }, [hitList])

  const handleSort = (field: NonNullable<HitListSortField>) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir(field === 'health' ? 'desc' : 'asc')
      return
    }
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  const displayRows = useMemo(() => {
    const q = customerFilter.trim().toLowerCase()
    let rows = [...hitList]
    if (stageFilter !== 'ALL') rows = rows.filter((r) => r.stage === stageFilter)
    if (salesPersonFilter !== 'ALL') {
      rows = rows.filter((r) => {
        const n = (r.salespersonName ?? '').trim() || 'Unassigned'
        return n === salesPersonFilter
      })
    }
    if (q) rows = rows.filter((r) => (r.customerName || '').toLowerCase().includes(q))

    if (!sortField) return rows

    const dir = sortDir === 'asc' ? 1 : -1

    rows.sort((a, b) => {
      switch (sortField) {
        case 'customerName':
          return (a.customerName || '').localeCompare(b.customerName || '') * dir
        case 'stage':
          return (a.stage || '').localeCompare(b.stage || '') * dir
        case 'salespersonName': {
          const na = (a.salespersonName ?? '').trim() || 'Unassigned'
          const nb = (b.salespersonName ?? '').trim() || 'Unassigned'
          return na.localeCompare(nb) * dir
        }
        case 'dealValue':
          return ((a.dealValue ?? 0) - (b.dealValue ?? 0)) * dir
        case 'lastActivity':
          return ((a.daysSinceActivity ?? 0) - (b.daysSinceActivity ?? 0)) * dir
        case 'alert':
          return a.label.localeCompare(b.label) * dir
        case 'confirmation':
          return (confirmationSortTime(a.confirmationDate) - confirmationSortTime(b.confirmationDate)) * dir
        case 'health': {
          const sa = computeDealHealth(hitListHealthProject(a))?.score ?? -1
          const sb = computeDealHealth(hitListHealthProject(b))?.score ?? -1
          return (sa - sb) * dir
        }
        default:
          return 0
      }
    })

    return rows
  }, [customerFilter, hitList, salesPersonFilter, sortDir, sortField, stageFilter])

  const hasActiveFilters =
    stageFilter !== 'ALL' || salesPersonFilter !== 'ALL' || customerFilter.trim() !== ''

  const n = hitList.length
  const isSales = role === UserRole.SALES
  const subtitle = isSales
    ? `${n} deal${n === 1 ? '' : 's'} need your attention`
    : `${n} deal${n === 1 ? '' : 's'} across your team need attention`

  const borderLeft = allClear ? '3px solid var(--accent-teal)' : '3px solid var(--accent-red)'

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="zenith-hit-list mb-5 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl ring-1 ring-[color:var(--border-default)] md:mb-6 lg:mb-0"
      style={{ ...cardBase, borderLeft }}
    >
      <div
        className="flex shrink-0 flex-wrap items-start justify-between gap-2 md:gap-2 px-5 py-4 md:px-3.5 md:py-2.5"
        style={{
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="min-w-0 flex gap-2.5 md:gap-2">
          <Target
            className="shrink-0 mt-0.5 w-[18px] h-[18px] md:w-4 md:h-4"
            strokeWidth={2}
            color="var(--accent-gold)"
            aria-hidden
          />
          <div>
            <h2
              className="zenith-hit-list-title text-[18px] font-bold leading-tight text-[color:var(--text-primary)] md:text-[15px]"
              style={{ fontFamily: "'Syne', var(--zenith-font-display), system-ui, sans-serif" }}
            >
              Today&apos;s Hit List
            </h2>
            <p
              className="mt-1 text-[13px] leading-snug text-[color:var(--text-secondary)] md:mt-0.5 md:text-[11px]"
              style={{ fontFamily: 'var(--zenith-font-body)' }}
            >
              {subtitle}
            </p>
            {!allClear && n > 0 ? (
              <p
                className="mt-1.5 hidden max-w-xl text-[12px] leading-snug text-[color:var(--text-muted)] md:mt-1 md:block md:text-[10px]"
                style={{ fontFamily: 'var(--zenith-font-body)' }}
              >
                Please scroll to the right and click{' '}
                <span className="text-[color:var(--text-secondary)]">Open →</span> to open the
                Quick Actions drawer and work on the project.
              </p>
            ) : null}
          </div>
        </div>
        {!allClear && (
          <span
            className="shrink-0 rounded-[20px] px-3 py-1 md:px-2 md:py-0.5 text-[13px] md:text-[11px] font-medium"
            style={{
              background: 'var(--accent-red-muted)',
              border: '1px solid var(--accent-red-border)',
              color: 'var(--accent-red)',
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
            <CheckCircle2 className="w-[18px] h-[18px] md:w-4 md:h-4 shrink-0" color="var(--accent-teal)" aria-hidden />
            <span
              className="text-[14px] md:text-[12px] text-center"
              style={{ color: 'var(--accent-teal)', fontFamily: 'var(--zenith-font-body)' }}
            >
              All clear — no urgent deals today
            </span>
          </div>
          <p
            className="text-[12px] text-[color:var(--text-muted)] md:text-[10px]"
            style={{ fontFamily: 'var(--zenith-font-body)' }}
          >
            Check back tomorrow
          </p>
        </div>
      ) : (
        <div className="flex h-full min-h-[8rem] w-full max-h-[min(42vh,320px)] flex-col overflow-hidden overscroll-y-contain sm:max-h-[min(44vh,340px)] lg:min-h-0 lg:max-h-none lg:flex-1">
          <div
            className="shrink-0 border-b border-[color:var(--border-default)] px-3 py-2 md:px-2"
            style={{ fontFamily: 'var(--zenith-font-body)' }}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <input
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                placeholder="Filter customer…"
                className="zenith-native-filter-input h-9 min-w-[8rem] flex-1 rounded-lg px-3 text-xs focus:outline-none sm:min-w-[10rem] sm:flex-none sm:max-w-[14rem]"
                aria-label="Filter hit list by customer"
              />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="zenith-native-select h-9 rounded-lg px-2.5 text-xs focus:outline-none"
                aria-label="Filter by stage"
              >
                <option value="ALL">All stages</option>
                {Array.from(new Set(hitList.map((r) => r.stage))).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={salesPersonFilter}
                onChange={(e) => setSalesPersonFilter(e.target.value)}
                className="zenith-native-select h-9 max-w-[200px] rounded-lg px-2.5 text-xs focus:outline-none"
                aria-label="Filter by sales person"
              >
                <option value="ALL">All salespeople</option>
                {salesPersonOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {hasActiveFilters && displayRows.length !== n && (
                <span className="whitespace-nowrap text-[11px] text-[color:var(--text-muted)]">
                  {displayRows.length} of {n} shown
                </span>
              )}
            </div>
          </div>
          <div className="zenith-hit-list-body min-h-0 flex-1 overflow-y-auto">
            <div className="zenith-scroll-x overflow-x-auto px-3 py-1 md:px-2 md:py-0">
            {/* Desktop / tablet — same columns as “Your pipeline today” + alert + confirmation */}
            <table className="zenith-table--data hidden md:table w-full text-left text-[11px] sm:text-xs min-w-[880px]">
              <thead>
                <tr className="border-b border-[color:var(--border-default)]">
                  <th
                    className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap w-[56px]"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                  >
                    <span className="hidden sm:inline">Sl No.</span>
                    <span className="sm:hidden">Prj #</span>
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold cursor-pointer select-none"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    onClick={() => handleSort('customerName')}
                  >
                    Customer {sortField === 'customerName' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold cursor-pointer select-none"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    onClick={() => handleSort('stage')}
                  >
                    Stage {sortField === 'stage' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold min-w-[6.5rem] cursor-pointer select-none"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    onClick={() => handleSort('salespersonName')}
                  >
                    Sales person {sortField === 'salespersonName' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold text-right cursor-pointer select-none"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    onClick={() => handleSort('dealValue')}
                  >
                    Deal value {sortField === 'dealValue' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold cursor-pointer select-none"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    onClick={() => handleSort('lastActivity')}
                  >
                    Last activity {sortField === 'lastActivity' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold cursor-pointer select-none"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    onClick={() => handleSort('alert')}
                  >
                    Alert {sortField === 'alert' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th
                    className="py-2 pr-2 font-semibold cursor-pointer select-none"
                    style={{ fontFamily: 'var(--zenith-font-body)' }}
                    onClick={() => handleSort('confirmation')}
                  >
                    Confirmation {sortField === 'confirmation' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th
                    className="py-2 w-[72px] cursor-pointer select-none text-center font-semibold"
                    style={{
                      fontFamily: 'var(--zenith-font-body)',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '8px 10px',
                    }}
                    onClick={() => handleSort('health')}
                  >
                    Health {sortField === 'health' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  <th className="py-2 pl-1 w-[88px]" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[color:var(--text-muted)]" style={{ fontFamily: 'var(--zenith-font-body)' }}>
                      {hasActiveFilters ? 'No deals match your filters.' : 'No rows to show.'}
                    </td>
                  </tr>
                ) : null}
                {displayRows.map((project, index) => {
                  const tone = zenithLastActivityTone(project.daysSinceActivity)
                  const lb = labelBadgeClass(project.label)
                  const sp = project.salespersonName
                  const dealParts = formatZenithDealInrParts(project.dealValue)
                  const spRow = zenithDealRowStagePillClass(project.stage)
                  return (
                    <motion.tr
                      key={project.id}
                      className="group border-b border-[color:var(--border-default)] hover:bg-[color:var(--bg-table-hover)]"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.25 }}
                    >
                      <td className="py-2.5 pr-2 text-right tabular-nums text-[color:var(--text-muted)] whitespace-nowrap">
                        {project.projectSerialNumber != null ? project.projectSerialNumber : '—'}
                      </td>
                      <td className="py-2.5 pr-2">
                        <span
                          className="inline-block max-w-[11rem] truncate align-bottom font-medium text-[color:var(--text-primary)]"
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
                        className="max-w-[9rem] truncate py-2.5 pr-2 text-[color:var(--text-secondary)]"
                        title={sp}
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {sp}
                      </td>
                      <td
                        className={`py-2.5 pr-2 text-right tabular-nums font-medium ${
                          dealParts.muted ? 'text-[color:var(--text-muted)]' : 'text-[color:var(--accent-gold)]'
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
                        className="whitespace-nowrap py-2.5 pr-2 tabular-nums text-[color:var(--text-secondary)]"
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
            <div className="divide-y divide-[color:var(--border-default)] md:hidden">
              {displayRows.length === 0 ? (
                <p
                  className="py-8 text-center text-[13px] text-[color:var(--text-muted)]"
                  style={{ fontFamily: 'var(--zenith-font-body)' }}
                >
                  {hasActiveFilters ? 'No deals match your filters.' : 'No rows to show.'}
                </p>
              ) : null}
              {displayRows.map((project, index) => {
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
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[15px] font-medium text-[color:var(--text-primary)]"
                          style={{ fontFamily: 'var(--zenith-font-body)' }}
                        >
                          {project.customerName}
                        </p>
                        <p
                          className="mt-0.5 text-[11px] tabular-nums text-[color:var(--text-muted)]"
                          style={{ fontFamily: 'var(--zenith-font-body)' }}
                        >
                          Sl No.: {project.projectSerialNumber != null ? project.projectSerialNumber : '—'}
                        </p>
                      </div>
                      <span className={spMobile} style={{ fontFamily: 'var(--zenith-font-body)' }}>
                        {project.stage}
                      </span>
                    </div>
                    <p
                      className="mt-1 truncate text-[12px] text-[color:var(--text-secondary)]"
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
                          color: dealParts.muted ? 'var(--text-muted)' : 'var(--accent-gold)',
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
                      className="mt-1.5 text-[12px] text-[color:var(--text-muted)]"
                      style={{ fontFamily: 'var(--zenith-font-body)' }}
                    >
                      Confirmation:{' '}
                      <span className="tabular-nums text-[color:var(--text-secondary)]">
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
        </div>
      )}
    </motion.div>
  )
}
