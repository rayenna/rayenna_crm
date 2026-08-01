import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { zenithExplorerProjectsMissingLifecycleBrands } from '../../utils/zenithBriefingMissingBrands'
import DashboardLifecycleBrandReminder from './DashboardLifecycleBrandReminder'
import DashboardMyDayPlanCard from './DashboardMyDayPlanCard'

type TileParams = { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }

interface Props {
  tileParams?: TileParams
  explorerProjects?: ZenithExplorerProject[] | null
  showLifecycleReminder?: boolean
  /** Keep attention under plan (for Zenith Plan | Hit List desktop row). */
  stackAttention?: boolean
}

/**
 * Today's plan + Things needing attention — side-by-side on laptop (lg+), stacked on phone.
 * Pass `stackAttention` when the row sits beside another panel (e.g. Hit List) so attention
 * stacks under the plan instead of splitting the left column.
 */
export default function DashboardPlanAttentionRow({
  tileParams,
  explorerProjects,
  showLifecycleReminder = false,
  stackAttention = false,
}: Props) {
  const missing =
    showLifecycleReminder && tileParams
      ? zenithExplorerProjectsMissingLifecycleBrands(explorerProjects ?? [])
      : []
  const showAttention = missing.length > 0 && tileParams != null
  const paired = showAttention

  return (
    <div
      className={[
        'grid min-w-0 gap-3 sm:gap-4',
        stackAttention ? 'mb-0' : 'mb-4',
        paired && !stackAttention ? 'lg:grid-cols-2 lg:items-stretch' : 'grid-cols-1',
      ].join(' ')}
    >
      <DashboardMyDayPlanCard paired={paired} className="min-h-0 h-full" />
      {showAttention ? (
        <DashboardLifecycleBrandReminder
          compact
          paired
          projects={explorerProjects}
          tileParams={tileParams}
          className="min-h-0 h-full"
        />
      ) : null}
    </div>
  )
}
