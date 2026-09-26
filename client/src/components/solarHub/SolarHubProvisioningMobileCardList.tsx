import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ProvisioningGapItem } from '../../types/solarHub'

type Props = {
  items: ProvisioningGapItem[]
  canManage: boolean
  busy?: boolean
  selected: Set<string>
  onToggle: (projectId: string) => void
  onProvision: (projectId: string) => void
  emptySlot?: ReactNode
}

/**
 * Narrow-viewport Provisioning gaps — select + provision without horizontal table swipe.
 */
export default function SolarHubProvisioningMobileCardList({
  items,
  canManage,
  busy,
  selected,
  onToggle,
  onProvision,
  emptySlot,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-4 py-10 text-center ring-1 ring-[color:var(--border-default)]">
        {emptySlot ?? (
          <p className="text-sm text-[color:var(--text-muted)]">
            All eligible projects have Hub accounts.
          </p>
        )}
      </div>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Provisioning gaps">
      {items.map((row) => (
        <li key={row.projectId}>
          <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3.5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
            <div className="flex items-start gap-3">
              {canManage ? (
                <label className="flex min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selected.has(row.projectId)}
                    onChange={() => onToggle(row.projectId)}
                    aria-label={`Select project ${row.slNo}`}
                    className="h-5 w-5 rounded border-[color:var(--border-input)] accent-[color:var(--accent-gold)]"
                  />
                </label>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                  {row.customerName}
                </p>
                <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                  <Link
                    to={`/projects/${row.projectId}`}
                    className="font-semibold text-[color:var(--accent-teal)] hover:underline"
                  >
                    Project #{row.slNo}
                  </Link>
                  {' · '}
                  {row.projectStatus.replace(/_/g, ' ')}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-muted)]">
                  {row.customerId}
                </p>
              </div>
            </div>
            {canManage ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onProvision(row.projectId)}
                className="mt-3 inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-3 text-sm font-bold text-[color:var(--accent-teal)] disabled:opacity-50"
              >
                Provision Hub account
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
