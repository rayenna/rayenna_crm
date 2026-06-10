import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { ProjectStatus } from '../../types'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { zenithExplorerProjectsMissingLifecycleBrands } from '../../utils/zenithBriefingMissingBrands'
import LifecycleBrandAttentionRow from './LifecycleBrandAttentionRow'

type TileParams = { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }

interface Props {
  projects: ZenithExplorerProject[] | null | undefined
  tileParams: TileParams
  compact?: boolean
  paired?: boolean
  className?: string
}

const MAX_VISIBLE = 5
const MAX_VISIBLE_COMPACT = 3

export default function DashboardLifecycleBrandReminder({
  projects,
  tileParams,
  compact = false,
  paired = false,
  className = '',
}: Props) {
  const list = Array.isArray(projects) ? projects : []
  const missing = zenithExplorerProjectsMissingLifecycleBrands(list)
  if (missing.length === 0) return null

  const maxRows = compact || paired ? MAX_VISIBLE_COMPACT : MAX_VISIBLE
  const visible = missing.slice(0, maxRows)
  const hiddenCount = missing.length - visible.length

  const projectsHref = buildProjectsUrl(
    {
      status: [
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ],
      lifecycleSpecsIncomplete: true,
    },
    tileParams,
  )

  return (
    <section
      className={[
        'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]',
        className,
      ].join(' ')}
      role="region"
      aria-labelledby="dashboard-notice-board-heading"
    >
      <div className="flex min-h-0 flex-1 flex-col border-l-4 border-[color:var(--accent-gold)]">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color:var(--border-default)] px-3 py-2.5 sm:px-3.5 sm:py-3">
          <div className="flex min-w-0 gap-2">
            <ClipboardList
              className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]"
              strokeWidth={2}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="dashboard-notice-board-heading"
                className="text-sm font-bold leading-tight text-[color:var(--text-primary)]"
              >
                Things Needing Attention
              </h2>
              {!paired ? (
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  Panel & inverter brands
                </p>
              ) : null}
              <p className="mt-1 text-[11px] leading-snug text-[color:var(--text-secondary)]">
                <span className="font-semibold text-[color:var(--text-primary)]">{missing.length}</span>
                {' '}
                {missing.length === 1 ? 'project' : 'projects'} missing lifecycle brand data
              </p>
            </div>
          </div>
          <Link
            to={projectsHref}
            className="inline-flex min-h-[32px] shrink-0 items-center justify-center self-start rounded-lg border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-2.5 text-[11px] font-bold text-[color:var(--accent-teal)] transition hover:brightness-105"
          >
            Projects →
          </Link>
        </div>

        <ul
          className={[
            'min-h-0 flex-1 divide-y divide-[color:var(--border-default)] overflow-y-auto bg-[color:color-mix(in_srgb,var(--bg-card)_92%,var(--zenith-table-header-bg))]',
            paired ? 'max-h-[220px] lg:max-h-[240px]' : 'max-h-[280px]',
          ].join(' ')}
        >
          {visible.map((project) => (
            <LifecycleBrandAttentionRow key={project.id} project={project} compact={compact || paired} />
          ))}
        </ul>

        {hiddenCount > 0 ? (
          <p className="shrink-0 border-t border-[color:var(--border-default)] px-3 py-2 text-[10px] text-[color:var(--text-muted)] sm:px-3.5">
            +{hiddenCount} more —{' '}
            <Link to={projectsHref} className="font-semibold text-[color:var(--accent-teal)] underline underline-offset-2">
              view all
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}
