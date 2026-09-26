import type { ReactNode } from 'react'
import type { SolarHubUser } from '../../types/solarHub'

type Props = {
  users: SolarHubUser[]
  onOpen: (userId: string) => void
  emptySlot?: ReactNode
}

function plantLabels(user: SolarHubUser): string[] {
  const bits: string[] = []
  if (user.project.solisStationId) bits.push('Solis')
  if (user.project.deyeStationId) bits.push('Deye')
  return bits
}

/**
 * Narrow-viewport Solar Hub Users list — tap card opens user detail.
 * Hierarchy: username primary → customer secondary → one plant accent → quiet Active.
 */
export default function SolarHubUsersMobileCardList({ users, onOpen, emptySlot }: Props) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-4 py-10 ring-1 ring-[color:var(--border-default)]">
        {emptySlot}
      </div>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Solar Hub users">
      {users.map((user) => {
        const plants = plantLabels(user)
        const unlinked = plants.length === 0
        return (
          <li key={user.id}>
            <div
              role="link"
              tabIndex={0}
              onClick={() => onOpen(user.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(user.id)
                }
              }}
              className="w-full cursor-pointer touch-manipulation rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3.5 text-left shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-[border-color,background-color] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-table-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[color:var(--text-primary)]">
                    @{user.username}
                    {user.isDemo ? (
                      <span className="ml-2 rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent-gold)]">
                        DEMO
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-[color:var(--text-secondary)]">
                    {user.project.customerName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-muted)]">
                    Project #{user.project.slNo} · {user.project.projectStatus.replace(/_/g, ' ')}
                  </p>
                </div>
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-[11px] font-medium text-[color:var(--text-muted)]"
                  title={user.isActive ? 'Active' : 'Inactive'}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      user.isActive
                        ? 'bg-[color:var(--accent-teal)]'
                        : 'bg-[color:var(--text-muted)] opacity-50'
                    }`}
                    aria-hidden
                  />
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {unlinked ? (
                  <span className="rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--accent-gold)]">
                    Unlinked
                  </span>
                ) : (
                  plants.map((label) => (
                    <span
                      key={label}
                      className="rounded-md border border-[color:var(--border-default)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--text-secondary)]"
                    >
                      {label}
                    </span>
                  ))
                )}
                {user.project.inverterBrand?.trim() ? (
                  <span className="text-[10px] text-[color:var(--text-muted)]">
                    {user.project.inverterBrand.trim()}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[color:var(--border-default)] pt-2.5 text-[11px] text-[color:var(--text-muted)]">
                <span className="truncate">{user.phone || 'No phone'}</span>
                <span className="shrink-0 tabular-nums">
                  {user.lastLoginAt
                    ? `Last login ${new Date(user.lastLoginAt).toLocaleDateString('en-IN')}`
                    : 'Never logged in'}
                </span>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
