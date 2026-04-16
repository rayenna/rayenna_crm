import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl, type PeDashboardBucket } from '../../utils/dashboardTileLinks'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'

type PeStatusRow = {
  key: PeDashboardBucket
  label: string
  count: number
  crmOrderValue: number
  peOrderValueExGst: number
  projectIds: string[]
}

const badgeClass: Record<PeStatusRow['key'], string> = {
  'proposal-ready':
    'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] border border-[color:var(--accent-teal-border)]',
  draft:
    'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] border border-[color:var(--accent-gold-border)]',
  'not-started':
    'bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)] border border-[color:var(--border-default)]',
  rest:
    'bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple)] border border-[color:var(--accent-purple-border)]',
}

function formatInr(value: number): string {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`
}

function filterExplorerByPeBucketIds(
  explorerProjects: ZenithExplorerProject[],
  projectIds: string[],
): ZenithExplorerProject[] {
  const idMap = new Map(explorerProjects.map((p) => [p.id, p]))
  return projectIds.map((id) => idMap.get(id)).filter((p): p is ZenithExplorerProject => p != null)
}

export default function ZenithProposalEngineCard({
  selectedFYs,
  selectedQuarters,
  selectedMonths,
  embedded = false,
  zenithExplorerProjects,
  onPeBucketClick,
}: {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  /** Inside ZenithFocusCollapsible: body only (no glass shell / gradient header / enter animation). */
  embedded?: boolean
  /** When set with `onPeBucketClick`, rows open the quick drawer instead of navigating away. */
  zenithExplorerProjects?: ZenithExplorerProject[]
  onPeBucketClick?: (args: {
    row: PeStatusRow
    filteredProjects: ZenithExplorerProject[]
  }) => void
}) {
  const tileParams = { selectedFYs, selectedQuarters, selectedMonths }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'proposal-engine-status', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      const res = await axiosInstance.get(`/api/dashboard/proposal-engine-status?${params.toString()}`)
      return res.data as { rows: PeStatusRow[] }
    },
    select: (data: { rows: PeStatusRow[] }) => ({
      rows: (data.rows ?? []).map((r) => ({
        ...r,
        projectIds: Array.isArray(r.projectIds) ? r.projectIds : [],
      })),
    }),
  })

  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const u = () => setNarrow(mq.matches)
    u()
    mq.addEventListener('change', u)
    return () => mq.removeEventListener('change', u)
  }, [])

  if (isLoading) {
    if (embedded) {
      return (
        <div className="p-3 sm:p-4 space-y-2">
          <div className="h-9 rounded-lg zenith-skeleton" />
          <div className="h-9 rounded-lg zenith-skeleton" />
          <div className="h-9 rounded-lg zenith-skeleton" />
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] max-lg:overflow-hidden overflow-visible lg:overflow-hidden min-h-[180px]">
        <div className="h-10 bg-gradient-to-r from-cyan-600/40 to-indigo-600/50 animate-pulse" />
        <div className="p-3 space-y-2">
          <div className="h-9 rounded-lg zenith-skeleton" />
          <div className="h-9 rounded-lg zenith-skeleton" />
          <div className="h-9 rounded-lg zenith-skeleton" />
        </div>
      </div>
    )
  }

  if (isError) {
    if (embedded) {
      return (
        <div className="p-4 border-t border-[color:var(--border-default)]">
          <p className="text-sm font-semibold text-[color:var(--accent-red)]">Proposal Engine</p>
          <p className="text-xs text-[color:var(--text-muted)] mt-1">{getFriendlyApiErrorMessage(error)}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]"
          >
            Retry
          </button>
        </div>
      )
    }
    return (
      <div className="rounded-xl p-4 border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
        <p className="text-sm font-semibold text-[color:var(--accent-red)]">Proposal Engine summary</p>
        <p className="text-xs text-[color:var(--text-muted)] mt-1">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]"
        >
          Retry
        </button>
      </div>
    )
  }

  const rows = data?.rows ?? []

  const drawerMode = Boolean(onPeBucketClick && zenithExplorerProjects != null)

  const rowShellClass =
    'flex justify-between items-start gap-2 py-2 px-2.5 rounded-xl bg-[color:var(--bg-input)] border border-[color:var(--border-default)] hover:border-[color:var(--accent-gold-border)] hover:bg-[color:var(--bg-table-hover)] transition-all min-w-0 text-inherit'

  const linksList = (
    <div className="p-3 sm:p-4 flex-1 min-h-0 space-y-1.5">
      {rows.map((row) => {
        const title = `${row.label}: ${row.count} projects — CRM ${formatInr(row.crmOrderValue)}${
          row.peOrderValueExGst > 0 ? `, PE ex GST ${formatInr(row.peOrderValueExGst)}` : ''
        }`
        const body = (
          <>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold flex-shrink-0 max-w-[48%] sm:max-w-none truncate ${badgeClass[row.key]}`}
            >
              {row.label}
            </span>
            <span className="text-right min-w-0">
              <span className="block text-xs font-semibold text-[color:var(--text-primary)] tabular-nums">
                {row.count.toLocaleString('en-IN')}{' '}
                <span className="text-[color:var(--accent-gold)]">({formatInr(row.crmOrderValue)})</span>
              </span>
              {row.peOrderValueExGst > 0 ? (
                <span className="block text-[10px] text-[color:var(--accent-teal)] font-medium mt-0.5">
                  PE ex GST {formatInr(row.peOrderValueExGst)}
                </span>
              ) : null}
            </span>
          </>
        )
        if (drawerMode && onPeBucketClick && zenithExplorerProjects) {
          return (
            <button
              key={row.key}
              type="button"
              className={`${rowShellClass} w-full text-left cursor-pointer`}
              title={title}
              onClick={() =>
                onPeBucketClick({
                  row,
                  filteredProjects: filterExplorerByPeBucketIds(zenithExplorerProjects, row.projectIds),
                })
              }
            >
              {body}
            </button>
          )
        }
        return (
          <Link
            key={row.key}
            to={buildProjectsUrl({ peBucket: row.key }, tileParams)}
            className={`${rowShellClass} no-underline`}
            title={title}
          >
            {body}
          </Link>
        )
      })}
    </div>
  )

  if (embedded) {
    return linksList
  }

  const cardClass =
    'rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] max-lg:overflow-hidden overflow-visible lg:overflow-hidden flex flex-col min-h-0'

  const cardBody = (
    <>
      <div className="shrink-0 px-3 py-2 bg-gradient-to-r from-[color:var(--accent-teal-muted)] via-[color:var(--accent-purple-muted)] to-[color:var(--bg-surface)] border-b border-[color:var(--border-default)]">
        <h3 className="zenith-display text-sm font-semibold text-[color:var(--text-primary)] tracking-tight">
          Proposal Engine
        </h3>
        <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5">PE readiness by project bucket</p>
      </div>
      {linksList}
    </>
  )

  if (narrow) {
    return <div className={cardClass}>{cardBody}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
      {cardBody}
    </motion.div>
  )
}
