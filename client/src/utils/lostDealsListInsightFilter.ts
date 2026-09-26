import { lostReasonLabel, lostToCompetitionLabel } from './lostReasonLabels'

export type LostListInsightFilter =
  | { kind: 'none' }
  | { kind: 'uncategorized' }
  | { kind: 'reason'; reason: string }
  | { kind: 'competition'; subtype: string }
  | { kind: 'salesperson'; name: string }
  | { kind: 'fy'; fy: string }

export type LostListProject = {
  lostReason: string | null
  lostToCompetitionReason: string | null
  salespersonName: string | null
  year: string | null
}

export function lostListInsightChipLabel(filter: LostListInsightFilter): string | null {
  switch (filter.kind) {
    case 'none':
      return null
    case 'uncategorized':
      return 'Uncategorized'
    case 'reason':
      return lostReasonLabel(filter.reason) || filter.reason
    case 'competition':
      return filter.subtype === 'UNCATEGORIZED'
        ? 'Competition · Uncategorized'
        : `Competition · ${lostToCompetitionLabel(filter.subtype) || filter.subtype}`
    case 'salesperson':
      return `Sales · ${filter.name}`
    case 'fy':
      return `FY · ${filter.fy}`
    default:
      return null
  }
}

export function projectMatchesLostListInsightFilter(
  p: LostListProject,
  filter: LostListInsightFilter,
): boolean {
  switch (filter.kind) {
    case 'none':
      return true
    case 'uncategorized':
      return !p.lostReason
    case 'reason':
      return p.lostReason === filter.reason
    case 'competition':
      if (filter.subtype === 'UNCATEGORIZED') {
        return p.lostReason === 'LOST_TO_COMPETITION' && !p.lostToCompetitionReason
      }
      return p.lostToCompetitionReason === filter.subtype
    case 'salesperson':
      return (p.salespersonName?.trim() || 'Unassigned') === filter.name
    case 'fy':
      return ((p.year && String(p.year).trim()) || 'Unknown') === filter.fy
    default:
      return true
  }
}
