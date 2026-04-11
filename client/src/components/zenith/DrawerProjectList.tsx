import { useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import type { ZenithListAmountMode } from '../../hooks/useQuickAction'

function rowAmount(p: ZenithExplorerProject, mode: ZenithListAmountMode): number {
  if (mode === 'gross_profit') return Number(p.gross_profit ?? 0)
  return Number(p.deal_value ?? 0)
}
import HealthBadge from './HealthBadge'
import {
  formatZenithDealInrParts,
  zenithDealRowStagePillClass,
  ZENITH_DEAL_OPEN_BUTTON_CLASS,
} from './zenithDealCardUi'
import { zenithSalespersonNameColor } from '../../utils/zenithSalespersonColor'
import { formatZenithSystemCapacityKw } from '../../utils/zenithSystemCapacityFormat'
import { computeDealHealth, zenithExplorerProjectToHealthProject } from '../../utils/dealHealthScore'

type SortKey = 'value' | 'health' | 'activity'

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DrawerProjectList({
  projects,
  onOpen,
  filterLabel,
  amountMode = 'deal_value',
}: {
  projects: ZenithExplorerProject[]
  onOpen: (p: ZenithExplorerProject) => void
  filterLabel: string
  /** Matches chart drill-down: FY profit lists use stored gross profit. */
  amountMode?: ZenithListAmountMode
}) {
  const [sortField, setSortField] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  /** Same interaction as “Your Pipeline today” headers: new column picks a default direction; same column toggles. */
  const handleSortPill = (key: SortKey) => {
    if (sortField !== key) {
      setSortField(key)
      setSortDir('desc')
      return
    }
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  const sorted = useMemo(() => {
    const copy = [...projects]
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'value') {
      copy.sort((a, b) => (rowAmount(a, amountMode) - rowAmount(b, amountMode)) * dir)
    } else if (sortField === 'activity') {
      copy.sort(
        (a, b) =>
          (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir,
      )
    } else {
      copy.sort((a, b) => {
        const sa = computeDealHealth(zenithExplorerProjectToHealthProject(a))?.score ?? 0
        const sb = computeDealHealth(zenithExplorerProjectToHealthProject(b))?.score ?? 0
        return (sa - sb) * dir
      })
    }
    return copy
  }, [projects, sortDir, sortField, amountMode])

  const total = useMemo(() => sorted.reduce((s, p) => s + rowAmount(p, amountMode), 0), [sorted, amountMode])

  const valueAccent = amountMode === 'gross_profit' ? '#00D4B4' : '#F5A623'
  const valuePillLabel = amountMode === 'gross_profit' ? 'Gross profit' : 'Order value'

  const pill = (key: SortKey, label: string) => {
    const active = sortField === key
    const arrow = active ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''
    const profitSort = key === 'value' && amountMode === 'gross_profit'
    return (
      <button
        type="button"
        key={key}
        onClick={() => handleSortPill(key)}
        aria-pressed={active}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
        className="rounded-[20px] px-2.5 py-1 text-[11px] transition-colors cursor-pointer"
        style={
          active
            ? profitSort
              ? {
                  background: 'rgba(0,212,180,0.12)',
                  border: '1px solid rgba(0,212,180,0.3)',
                  color: '#00D4B4',
                }
              : {
                  background: 'rgba(245,166,35,0.12)',
                  border: '1px solid rgba(245,166,35,0.3)',
                  color: '#F5A623',
                }
            : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
              }
        }
      >
        {label}
        {arrow}
      </button>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
        <Inbox className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} aria-hidden />
        <p className="text-sm text-white/50">No projects match this filter</p>
        <p className="text-xs mt-1 text-white/30">{filterLabel}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
        {pill('value', valuePillLabel)}
        {pill('health', 'Health Score')}
        {pill('activity', 'Last Activity')}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {sorted.map((p) => {
          const assignee = (p.assigned_to_name || '').trim() || null
          const assigneeColor = zenithSalespersonNameColor(assignee)
          const raw = rowAmount(p, amountMode)
          const dealParts =
            amountMode === 'gross_profit'
              ? { text: raw === 0 ? '—' : formatINR(raw), muted: raw === 0 }
              : formatZenithDealInrParts(raw)
          return (
            <div
              key={p.id}
              className="group flex items-center gap-2.5 py-3 border-b border-white/[0.05]"
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-medium text-white truncate"
                  style={{ fontFamily: 'var(--zenith-font-body), DM Sans, sans-serif' }}
                >
                  {p.customer_name}
                </div>
                <p
                  className="mt-0.5 truncate text-[10px] leading-tight font-semibold"
                  style={{
                    fontFamily: 'var(--zenith-font-body), DM Sans, sans-serif',
                    color: assigneeColor,
                  }}
                  title={assignee ?? 'Unassigned'}
                >
                  {assignee ?? 'Unassigned'}
                </p>
                <div className="mt-1">
                  <span
                    className={zenithDealRowStagePillClass(p.stageLabel)}
                    style={{ fontFamily: 'var(--zenith-font-body), DM Sans, sans-serif' }}
                  >
                    {p.stageLabel}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="text-[12px] font-medium tabular-nums leading-tight"
                  style={{
                    fontFamily: 'var(--zenith-font-body), DM Sans, sans-serif',
                    color: dealParts.muted ? 'rgba(255,255,255,0.3)' : valueAccent,
                  }}
                >
                  {dealParts.text}
                </div>
                <div
                  className="mt-0.5 text-[10px] tabular-nums leading-tight text-white/38"
                  style={{ fontFamily: 'var(--zenith-font-body), DM Sans, sans-serif' }}
                  title="System capacity"
                >
                  {formatZenithSystemCapacityKw(p.system_capacity_kw, 'emDash')}
                </div>
                <div className="mt-1 flex justify-end">
                  <HealthBadge project={zenithExplorerProjectToHealthProject(p)} size="sm" showLabel={false} />
                </div>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className={ZENITH_DEAL_OPEN_BUTTON_CLASS}
                  style={{ fontFamily: 'var(--zenith-font-body), DM Sans, sans-serif' }}
                  aria-label={`Open quick actions for ${p.customer_name}`}
                >
                  Open →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="shrink-0 pt-3 mt-1 flex justify-between items-center border-t border-white/[0.08]"
        style={{ paddingBottom: 4 }}
      >
        <span className="text-xs text-white/40">{sorted.length} projects</span>
        <span className="text-xs font-medium" style={{ color: valueAccent }}>
          Total: {formatINR(total)}
        </span>
      </div>
    </div>
  )
}
