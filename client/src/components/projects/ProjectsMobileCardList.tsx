import type { ReactNode } from 'react'
import { format } from 'date-fns'
import type { Project } from '../../types'
import HealthBadge from '../zenith/HealthBadge'
import { projectDetailToHealthProject } from '../../utils/dealHealthScore'
import { projectStatusStagePillClass } from '../zenith/zenithDealCardUi'
import { getProjectNameCustomerTypeTextClass } from '../../utils/customerTypeStyles'
import { getSalesTeamColor } from '../dashboard/salesTeamColors'
import CapacitySpecsPopover from './CapacitySpecsPopover'

type Props = {
  projects: Project[]
  onOpen: (projectId: string) => void
  emptySlot?: ReactNode
}

function paymentPillClass(status: string | null | undefined): string {
  if (status === 'FULLY_PAID') {
    return 'border border-emerald-400/35 bg-[color:color-mix(in srgb,var(--accent-teal) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
  }
  if (status === 'PARTIAL') {
    return 'border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in srgb,var(--accent-gold) 14%, var(--bg-card))] text-[color:var(--text-primary)]'
  }
  return 'border border-[color:var(--accent-red-border)] bg-[color:color-mix(in srgb,var(--accent-red) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
}

/**
 * Narrow-viewport Projects list — tap card opens detail (no horizontal table swipe).
 */
export default function ProjectsMobileCardList({ projects, onOpen, emptySlot }: Props) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] px-4 py-10 ring-1 ring-[color:var(--border-default)]">
        {emptySlot}
      </div>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Projects">
      {projects.map((project) => {
        const payment = project.paymentStatus ?? 'PENDING'
        return (
          <li key={project.id}>
            <div
              role="link"
              tabIndex={0}
              onClick={() => onOpen(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(project.id)
                }
              }}
              className="w-full cursor-pointer touch-manipulation rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3.5 text-left shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-[border-color,background-color] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-table-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-semibold leading-snug ${getProjectNameCustomerTypeTextClass(project.customer?.customerType)}`}
                  >
                    #{project.slNo} · {project.customer?.customerName || 'Unknown Customer'}
                  </p>
                  {project.salesperson?.name ? (
                    <p
                      className="mt-0.5 truncate text-[11px]"
                      style={{ color: getSalesTeamColor(project.salesperson.name, 0) }}
                    >
                      {project.salesperson.name}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 pt-0.5">
                  <HealthBadge
                    project={projectDetailToHealthProject(project)}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${projectStatusStagePillClass(project.projectStatus)}`}
                >
                  {project.projectStatus.replace(/_/g, ' ')}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${paymentPillClass(payment)}`}
                >
                  {String(payment).replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3 border-t border-[color:var(--border-default)] pt-2.5">
                <div
                  className="min-w-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                    Capacity
                  </p>
                  <CapacitySpecsPopover
                    systemCapacity={project.systemCapacity}
                    panelBrand={project.panelBrand}
                    inverterBrand={project.inverterBrand}
                    inverterCapacityKw={project.inverterCapacityKw}
                    panelType={project.panelType}
                    panelCapacityW={project.panelCapacityW}
                  />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                    Order value
                  </p>
                  <p className="text-sm font-bold tabular-nums text-[color:var(--accent-teal)]">
                    {project.projectCost ? `₹${project.projectCost.toLocaleString('en-IN')}` : '—'}
                  </p>
                  {project.confirmationDate ? (
                    <p className="mt-0.5 text-[10px] tabular-nums text-[color:var(--text-muted)]">
                      Conf {format(new Date(project.confirmationDate), 'dd MMM yy')}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
