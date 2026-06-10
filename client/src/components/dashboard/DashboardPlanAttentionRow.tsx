import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { zenithExplorerProjectsMissingLifecycleBrands } from '../../utils/zenithBriefingMissingBrands'
import DashboardLifecycleBrandReminder from './DashboardLifecycleBrandReminder'
import DashboardMyDayPlanCard from './DashboardMyDayPlanCard'

type TileParams = { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }

interface Props {
  tileParams?: TileParams
  explorerProjects?: ZenithExplorerProject[] | null
  showLifecycleReminder?: boolean
}

/**
 * Today's plan + Things needing attention — side-by-side on laptop (lg+), stacked on phone.
 */
export default function DashboardPlanAttentionRow({
  tileParams,
  explorerProjects,
  showLifecycleReminder = false,
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
        'mb-4 grid min-w-0 gap-3 sm:gap-4',
        paired ? 'lg:grid-cols-2 lg:items-stretch' : 'grid-cols-1',
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
