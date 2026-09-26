import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { HubMaintenanceRequest, HubMaintenanceRequestStatus } from '../../types/solarHub'

type Props = {
  items: HubMaintenanceRequest[]
  canManage: boolean
  busy?: boolean
  onStatusChange: (id: string, status: HubMaintenanceRequestStatus) => void
  nextStatuses: Partial<Record<HubMaintenanceRequestStatus, HubMaintenanceRequestStatus[]>>
  statusBadgeClass: (status: HubMaintenanceRequestStatus) => string
  emptySlot?: ReactNode
}

/**
 * Narrow-viewport Maintenance requests — status actions stay on-card with 44px targets.
 */
export default function SolarHubMaintenanceMobileCardList({
  items,
  canManage,
  busy,
  onStatusChange,
  nextStatuses,
  statusBadgeClass,
  emptySlot,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-4 py-10 text-center ring-1 ring-[color:var(--border-default)]">
        {emptySlot ?? (
          <p className="text-sm text-[color:var(--text-muted)]">No maintenance requests yet.</p>
        )}
      </div>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Maintenance requests">
      {items.map((row) => {
        const next = nextStatuses[row.status] ?? []
        return (
          <li key={row.id}>
            <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3.5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                    {row.customerName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                    <Link
                      to={`/solar-hub/users?q=${encodeURIComponent(row.username)}`}
                      className="text-[color:var(--accent-teal)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{row.username}
                    </Link>
                    {' · '}
                    <Link
                      to={`/projects/${row.projectId}`}
                      className="text-[color:var(--accent-teal)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Project #{row.projectSlNo}
                    </Link>
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(row.status)}`}
                >
                  {row.status.replace(/_/g, ' ')}
                </span>
              </div>

              <p className="mt-2.5 text-sm font-medium text-[color:var(--text-primary)]">{row.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--text-muted)]">
                {row.requestType === 'SCHEDULE_SERVICE' ? 'Schedule service' : 'Report issue'}
                {row.description
                  ? ` · ${row.description.slice(0, 100)}${row.description.length > 100 ? '…' : ''}`
                  : ''}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border-default)] pt-2.5 text-[11px] text-[color:var(--text-muted)]">
                <span>Submitted {new Date(row.createdAt).toLocaleDateString('en-IN')}</span>
                <span>
                  Preferred{' '}
                  {row.preferredDate
                    ? new Date(row.preferredDate).toLocaleDateString('en-IN')
                    : '—'}
                </span>
              </div>

              {canManage && next.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {next.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => onStatusChange(row.id, s)}
                      className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-xs font-bold uppercase text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)] disabled:opacity-50"
                    >
                      → {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
