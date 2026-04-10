import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { ZENITH_INVERTER_COST_SHARE, ZENITH_PANEL_COST_SHARE } from '../constants/zenithLifecycleCost'

/** One row per brand — horizontal bar charts (same shape as Loans by bank). */
export type ZenithLifecycleBrandBarRow = {
  brandLabel: string
  count: number
  orderValueSum: number
  /** Sum of `system_capacity_kw` for projects in this brand that have a positive value. */
  systemCapacitySumKw: number
  /** Panel: 50.5% of order sum; Inverter: 10.9% of order sum. */
  estimatedComponentCost: number
}

function eligibleWithBothBrands(projects: ZenithExplorerProject[]): ZenithExplorerProject[] {
  return projects.filter((p) => p.panel_brand?.trim() && p.inverter_brand?.trim())
}

/**
 * Aggregate project counts by panel or inverter brand for the current Zenith date scope.
 * Only includes projects with both lifecycle brands filled.
 */
export function buildZenithLifecycleBrandBarRows(
  projects: ZenithExplorerProject[],
  kind: 'panel' | 'inverter',
): ZenithLifecycleBrandBarRow[] {
  const eligible = eligibleWithBothBrands(projects)
  const getKey =
    kind === 'panel'
      ? (p: ZenithExplorerProject) => p.panel_brand!.trim()
      : (p: ZenithExplorerProject) => p.inverter_brand!.trim()

  const map = new Map<string, { count: number; order: number; capacitySumKw: number }>()
  for (const p of eligible) {
    const k = getKey(p)
    const prev = map.get(k) ?? { count: 0, order: 0, capacitySumKw: 0 }
    prev.count += 1
    prev.order += Number(p.deal_value ?? 0)
    const kw = p.system_capacity_kw
    if (typeof kw === 'number' && Number.isFinite(kw) && kw > 0) {
      prev.capacitySumKw += kw
    }
    map.set(k, prev)
  }

  const share = kind === 'panel' ? ZENITH_PANEL_COST_SHARE : ZENITH_INVERTER_COST_SHARE
  return [...map.entries()]
    .map(([brandLabel, v]) => ({
      brandLabel,
      count: v.count,
      orderValueSum: v.order,
      systemCapacitySumKw: v.capacitySumKw,
      estimatedComponentCost: v.order * share,
    }))
    .sort((a, b) => b.count - a.count || a.brandLabel.localeCompare(b.brandLabel))
}
