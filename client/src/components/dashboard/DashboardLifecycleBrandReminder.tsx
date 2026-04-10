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
      className="min-w-0 rounded-lg border border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-sm"
      role="region"
      aria-labelledby="dashboard-notice-board-heading"
    >
      <div className="flex gap-2.5 border-l-[3px] border-amber-500/80 py-2.5 pl-3 pr-3 sm:gap-3 sm:py-3 sm:pl-3.5 sm:pr-4">
        <ClipboardList
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600/90"
          strokeWidth={2}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2
            id="dashboard-notice-board-heading"
            className="text-sm font-semibold leading-tight text-slate-800"
          >
            Things Needing Immediate Attention
          </h2>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Lifecycle — panel &amp; inverter brands
          </p>
          <p className="mt-1.5 text-xs leading-snug text-slate-600 sm:text-[13px] sm:leading-relaxed">
            <span className="font-medium text-slate-700">{missing.length}</span>
            {' project'}
            {missing.length === 1 ? '' : 's'} in Under Installation, Completed, or Completed – Subsidy Credited
            {' — '}
            panel and/or inverter brand not entered
            {nameList ? (
              <>
                {' · '}
                <span className="text-slate-700">{nameList}</span>
              </>
            ) : null}
            .
          </p>
          <Link
            to={projectsHref}
            className="mt-1.5 inline-block text-xs font-medium text-primary-600 underline decoration-primary-600/30 underline-offset-2 transition hover:text-primary-700 hover:decoration-primary-600/60 sm:text-[13px]"
          >
            Open in Projects
          </Link>
        </div>
      </div>
    </section>
  )
}
