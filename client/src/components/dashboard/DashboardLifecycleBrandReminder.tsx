import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { ProjectStatus } from '../../types'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import {
  formatBriefingCustomerNameList,
  zenithExplorerProjectsMissingLifecycleBrands,
} from '../../utils/zenithBriefingMissingBrands'

type TileParams = { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }

/**
 * Compact dashboard notice when late-stage projects are missing panel and/or inverter brand.
 */
export default function DashboardLifecycleBrandReminder({
  projects,
  tileParams,
}: {
  projects: ZenithExplorerProject[] | null | undefined
  tileParams: TileParams
}) {
  const list = Array.isArray(projects) ? projects : []
  const missing = zenithExplorerProjectsMissingLifecycleBrands(list)
  if (missing.length === 0) return null

  const nameList = formatBriefingCustomerNameList(missing)
  const projectsHref = buildProjectsUrl(
    {
      status: [
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ],
    },
    tileParams,
  )

  return (
    <section
      className="min-w-0 rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:rounded-2xl"
      role="region"
      aria-labelledby="dashboard-notice-board-heading"
    >
      <div className="flex gap-2.5 border-l-4 border-[color:var(--accent-gold)] py-2.5 pl-3 pr-3 sm:gap-3 sm:py-3 sm:pl-3.5 sm:pr-4">
        <ClipboardList
          className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]"
          strokeWidth={2}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2
            id="dashboard-notice-board-heading"
            className="text-sm font-semibold leading-tight text-[color:var(--text-primary)]"
          >
            Things Needing Immediate Attention
          </h2>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-muted)]">
            Lifecycle — panel & inverter brands
          </p>
          <p className="mt-1.5 text-xs leading-snug text-[color:var(--text-secondary)] sm:text-[13px] sm:leading-relaxed">
            <span className="font-medium text-[color:var(--text-primary)]">{missing.length}</span>
            {' project'}
            {missing.length === 1 ? '' : 's'} in Under Installation, Completed, or Completed – Subsidy Credited
            {' — '}
            panel and/or inverter brand not entered
            {nameList ? (
              <>
                {' · '}
                <span className="text-[color:var(--text-primary)]">{nameList}</span>
              </>
            ) : null}
            .
          </p>
          <Link
            to={projectsHref}
            className="mt-1.5 inline-block text-xs font-semibold text-[color:var(--accent-teal)] underline decoration-[color:color-mix(in_srgb,var(--accent-teal)_45%,transparent)] underline-offset-2 transition hover:text-[color:var(--text-primary)] hover:decoration-[color:var(--accent-teal)] sm:text-[13px]"
          >
            Open in Projects
          </Link>
        </div>
      </div>
    </section>
  )
}
