import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { zenithExplorerProjectsMissingLifecycleBrands } from '../../utils/zenithBriefingMissingBrands'
import { dataSenseHitsOnExplorerProjects } from '../../utils/dataSense'
import DashboardLifecycleBrandReminder from './DashboardLifecycleBrandReminder'
import DashboardMyDayPlanCard from './DashboardMyDayPlanCard'

type TileParams = { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }

interface Props {
  tileParams?: TileParams
  explorerProjects?: ZenithExplorerProject[] | null
  showLifecycleReminder?: boolean
  /** Data Sense Needs review (Sales / Management / Admin). */
  showDataSenseReminder?: boolean
  /** Keep attention under plan (for Zenith Plan | Hit List desktop row). */
  stackAttention?: boolean
  /**
   * Stretch the plan card to the parent column height (Ops/Finance beside Weighted open pipeline).
   * Attention cards (if any) stack under the plan inside the same column.
   */
  fillColumnHeight?: boolean
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
  showDataSenseReminder = false,
  stackAttention = false,
  fillColumnHeight = false,
}: Props) {
  const list = explorerProjects ?? []
  const missing =
    showLifecycleReminder && tileParams ? zenithExplorerProjectsMissingLifecycleBrands(list) : []
  const dataSenseHits =
    showDataSenseReminder && tileParams ? dataSenseHitsOnExplorerProjects(list) : []
  const showAttention = (missing.length > 0 || dataSenseHits.length > 0) && tileParams != null
  const paired = showAttention

  if (fillColumnHeight) {
    return (
      <div className="mb-0 flex h-full min-h-0 min-w-0 flex-col gap-3">
        <DashboardMyDayPlanCard
          paired={paired}
          fillHeight
          className={showAttention ? 'min-h-0 flex-1' : 'min-h-0 h-full flex-1'}
        />
        {showAttention ? (
          <DashboardLifecycleBrandReminder
            compact
            paired
            projects={explorerProjects}
            tileParams={tileParams}
            className="min-h-0 shrink-0"
            showBrandGaps={showLifecycleReminder}
            dataSenseHits={dataSenseHits}
          />
        ) : null}
      </div>
    )
  }

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
          showBrandGaps={showLifecycleReminder}
          dataSenseHits={dataSenseHits}
        />
      ) : null}
    </div>
  )
}
