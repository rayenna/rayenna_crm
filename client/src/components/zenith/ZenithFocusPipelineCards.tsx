import HealthBadge from './HealthBadge'
import { pipelineRowToHealthProject } from '../../utils/dealHealthScore'
import type { SalesPipelineRow } from './zenithFocusRowTypes'
import { ZenithFocusCardList } from './ZenithFocusCardShell'
import {
  formatZenithDealInrParts,
  zenithDealRowStagePillClassMobile,
  zenithLastActivityTone,
  ZENITH_DEAL_OPEN_BUTTON_DENSE_CLASS,
} from './zenithDealCardUi'

type Props = {
  rows: SalesPipelineRow[]
  emptyMessage?: string
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }) => void
}

export default function ZenithFocusPipelineCards({
  rows,
  emptyMessage = 'No pipeline rows for this period.',
  onOpenDrawer,
}: Props) {
  return (
    <ZenithFocusCardList isEmpty={rows.length === 0} emptyMessage={emptyMessage}>
      {rows.map((r) => {
        const tone = zenithLastActivityTone(r.daysSinceActivity)
        const sp = (r.salespersonName ?? '').trim() || 'Unassigned'
        const dealParts = formatZenithDealInrParts(r.dealValue)
        return (
          <article
            key={r.projectId}
            className="group py-3.5 first:pt-2 hover:bg-[color:var(--bg-table-hover)]"
            role="listitem"
            aria-label={r.customerName}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[15px] font-medium text-[color:var(--text-primary)]"
                  style={{ fontFamily: 'var(--zenith-font-body)' }}
                >
                  {r.customerName}
                </p>
                <p
                  className="mt-0.5 text-[11px] tabular-nums text-[color:var(--text-muted)]"
                  style={{ fontFamily: 'var(--zenith-font-body)' }}
                >
                  Sl No.: {r.projectSerialNumber != null ? r.projectSerialNumber : '—'}
                </p>
              </div>
              <span className={zenithDealRowStagePillClassMobile(r.stage)} style={{ fontFamily: 'var(--zenith-font-body)' }}>
                {r.stage}
              </span>
            </div>
            <p
              className="mt-1 truncate text-[12px] text-[color:var(--text-secondary)]"
              style={{ fontFamily: 'var(--zenith-font-body)' }}
              title={sp}
            >
              {sp}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p
                className="text-[15px] font-medium tabular-nums"
                style={{
                  fontFamily: 'var(--zenith-font-body)',
                  color: dealParts.muted ? 'var(--text-muted)' : 'var(--accent-gold)',
                }}
              >
                {dealParts.text}
              </p>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${tone.className} ${tone.text}`}
              >
                {r.daysSinceActivity}d ago
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <HealthBadge project={pipelineRowToHealthProject(r)} size="sm" showLabel={false} />
              <button
                type="button"
                onClick={() =>
                  onOpenDrawer?.({ id: r.projectId, customerName: r.customerName, stageLabel: r.stage })
                }
                className={ZENITH_DEAL_OPEN_BUTTON_DENSE_CLASS}
                style={{ fontFamily: 'var(--zenith-font-body)', minHeight: 44 }}
                aria-label={`Open quick actions for ${r.customerName}`}
              >
                Open →
              </button>
            </div>
          </article>
        )
      })}
    </ZenithFocusCardList>
  )
}
