import type { ZenithExplorerProject } from '../types/zenithExplorer'

/** Stage display labels → win probability (open pipeline forecast). */
const STAGE_PROBABILITY: Record<string, number> = {
  Lead: 0.1,
  'Site Survey': 0.25,
  Proposal: 0.45,
  'Confirmed Order': 0.85,
  'Under Installation': 0.9,
  'Submitted for Subsidy': 0.95,
  Completed: 1,
  'Completed - Subsidy Credited': 1,
  Lost: 0,
}

const TERMINAL_STAGE_LABELS = new Set([
  'Completed',
  'Completed - Subsidy Credited',
  'Lost',
])

export type ForecastBreakdownRow = {
  label: string
  weighted: number
  count: number
  raw: number
}

export type ForecastResult = {
  totalForecast: number
  byLeadSource: ForecastBreakdownRow[]
  bySalesMember: ForecastBreakdownRow[]
  bySegment: ForecastBreakdownRow[]
  byStage: ForecastBreakdownRow[]
  dealCount: number
}

function probForStage(stageLabel: string): number {
  return STAGE_PROBABILITY[stageLabel] ?? 0.1
}

function groupAndWeight(
  deals: ZenithExplorerProject[],
  keyFn: (p: ZenithExplorerProject) => string,
): ForecastBreakdownRow[] {
  const groups: Record<string, { label: string; weighted: number; count: number; raw: number }> = {}
  for (const p of deals) {
    const key = keyFn(p)
    const value = Number(p.deal_value ?? 0)
    const prob = probForStage(p.stageLabel)
    const weighted = value * prob
    if (!groups[key]) {
      groups[key] = { label: key, weighted: 0, count: 0, raw: 0 }
    }
    groups[key].weighted += weighted
    groups[key].count += 1
    groups[key].raw += value
  }
  return Object.values(groups)
    .map((g) => ({ ...g, weighted: Math.round(g.weighted) }))
    .sort((a, b) => b.weighted - a.weighted)
}

export function computeForecast(projects: ZenithExplorerProject[] | null | undefined): ForecastResult {
  const list = projects ?? []
  const openDeals = list.filter((p) => !TERMINAL_STAGE_LABELS.has(p.stageLabel))

  const totalForecast = Math.round(
    openDeals.reduce((sum, p) => {
      const value = Number(p.deal_value ?? 0)
      return sum + value * probForStage(p.stageLabel)
    }, 0),
  )

  return {
    totalForecast,
    byLeadSource: groupAndWeight(openDeals, (p) => p.lead_source || 'Unknown'),
    bySalesMember: groupAndWeight(openDeals, (p) => p.assigned_to_name || 'Unassigned'),
    bySegment: groupAndWeight(openDeals, (p) => p.customer_segment || 'Unknown'),
    byStage: groupAndWeight(openDeals, (p) => p.stageLabel || 'Unknown'),
    dealCount: openDeals.length,
  }
}

/** Weighted value for sorting “+N more” drill-down list. */
export function weightedDealValue(p: ZenithExplorerProject): number {
  return Number(p.deal_value ?? 0) * probForStage(p.stageLabel)
}
