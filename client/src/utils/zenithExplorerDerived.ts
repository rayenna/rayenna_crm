import type { HitListProjectRow } from '../hooks/useHitList'
import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { inDashboardPipelineSlice, matchesDashboardRevenueWhere } from './zenithChartDrilldown'

/** Same statuses as `/api/dashboard/zenith-focus` sales pipeline (Hit List source). */
const HIT_LIST_PIPELINE_STATUSES = new Set(['LEAD', 'SITE_SURVEY', 'PROPOSAL', 'CONFIRMED'])

const HIT_LIST_PIPELINE_CAP = 80

export type ExplorerLeadSourceRow = {
  leadSourceLabel: string
  revenue: number
  projectCount: number
}

export type ExplorerSalesTeamRow = {
  salespersonName: string
  totalOrderValue: number
  projectCount: number
}

export type ExplorerRevenueBySalespersonRow = {
  salespersonName: string
  revenue: number
  projectCount: number
}

export type ExplorerSalesTeamPerformance = {
  salesTeamData: ExplorerSalesTeamRow[]
  revenueBySalesperson: ExplorerRevenueBySalespersonRow[]
}

function parseTs(iso: string | null | undefined): number {
  if (!iso) return NaN
  const n = Date.parse(iso)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Map explorer rows to the Hit List pipeline shape (Lead / Survey / Proposal / Confirmed,
 * oldest activity first, cap 80) — same cohort as zenith-focus `salesPipeline.rows`.
 */
export function explorerToHitListRows(
  projects: ZenithExplorerProject[],
  nowMs = Date.now(),
): HitListProjectRow[] {
  return projects
    .filter((p) => HIT_LIST_PIPELINE_STATUSES.has(p.projectStatus))
    .sort((a, b) => parseTs(a.updated_at) - parseTs(b.updated_at))
    .slice(0, HIT_LIST_PIPELINE_CAP)
    .map((p) => {
      const updated = parseTs(p.updated_at)
      const remark = parseTs(p.last_remark_at)
      const lastTs = Math.max(
        Number.isFinite(updated) ? updated : 0,
        Number.isFinite(remark) ? remark : 0,
      )
      const daysSinceActivity = lastTs > 0 ? Math.floor((nowMs - lastTs) / 86400000) : 0
      return {
        projectId: p.id,
        projectSerialNumber: p.project_serial_number ?? undefined,
        customerName: p.customer_name || '—',
        stage: p.stageLabel,
        dealValue: p.deal_value ?? 0,
        daysSinceActivity,
        expectedCloseDate: p.expected_close_date ?? null,
        confirmationDate: p.confirmation_date ?? null,
        createdAt: p.created_at ?? undefined,
        updatedAt: p.updated_at,
        stageEnteredAt: p.stage_entered_at ?? null,
        salespersonId: p.assigned_to_id ?? undefined,
        salespersonName: p.assigned_to_name,
        advanceReceived: p.advance_received ?? 0,
        leadSource: p.lead_source || null,
        paymentStatus: p.payment_status ?? null,
        balanceAmount: p.balance_amount ?? null,
        lastRemarkAt: p.last_remark_at ?? null,
      }
    })
}

/** Revenue bars: confirmed+ with deal value, excluding null lead source (`Unknown` in explorer). */
export function revenueByLeadSourceFromExplorer(
  projects: ZenithExplorerProject[],
): ExplorerLeadSourceRow[] {
  const map = new Map<string, { revenue: number; projectCount: number }>()
  for (const p of projects) {
    if (!matchesDashboardRevenueWhere(p)) continue
    const label = (p.lead_source || '').trim()
    if (!label || label === 'Unknown') continue
    const cur = map.get(label) ?? { revenue: 0, projectCount: 0 }
    cur.revenue += p.deal_value || 0
    cur.projectCount += 1
    map.set(label, cur)
  }
  return Array.from(map.entries())
    .map(([leadSourceLabel, v]) => ({
      leadSourceLabel,
      revenue: v.revenue,
      projectCount: v.projectCount,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

/**
 * Sales-team pipeline + revenue from explorer (assigned deals only).
 * Pipeline = not Lost with deal value; revenue = `matchesDashboardRevenueWhere`.
 */
export function salesTeamPerformanceFromExplorer(
  projects: ZenithExplorerProject[],
): ExplorerSalesTeamPerformance {
  const pipe = new Map<string, ExplorerSalesTeamRow>()
  const rev = new Map<string, ExplorerRevenueBySalespersonRow>()
  for (const p of projects) {
    const id = p.assigned_to_id
    if (!id) continue
    const name = p.assigned_to_name?.trim() || 'Unknown'
    if (inDashboardPipelineSlice(p)) {
      const cur = pipe.get(id) ?? { salespersonName: name, totalOrderValue: 0, projectCount: 0 }
      cur.totalOrderValue += p.deal_value || 0
      cur.projectCount += 1
      pipe.set(id, cur)
    }
    if (matchesDashboardRevenueWhere(p)) {
      const cur = rev.get(id) ?? { salespersonName: name, revenue: 0, projectCount: 0 }
      cur.revenue += p.deal_value || 0
      cur.projectCount += 1
      rev.set(id, cur)
    }
  }
  return {
    salesTeamData: Array.from(pipe.values()).sort((a, b) => b.totalOrderValue - a.totalOrderValue),
    revenueBySalesperson: Array.from(rev.values()).sort((a, b) => b.revenue - a.revenue),
  }
}

export function mergeSalesTeamChartRows(perf: ExplorerSalesTeamPerformance): {
  name: string
  revenue: number
  pipeline: number
}[] {
  const names = new Set([
    ...perf.revenueBySalesperson.map((r) => r.salespersonName),
    ...perf.salesTeamData.map((p) => p.salespersonName),
  ])
  return Array.from(names).map((name) => ({
    name,
    revenue: perf.revenueBySalesperson.find((r) => r.salespersonName === name)?.revenue ?? 0,
    pipeline: perf.salesTeamData.find((p) => p.salespersonName === name)?.totalOrderValue ?? 0,
  }))
}

/** Mean days in current status (stage_entered_at ?? created_at → now), same as dashboard avg-days. */
export function avgDaysByStatusFromExplorer(
  projects: ZenithExplorerProject[],
  nowMs = Date.now(),
): Record<string, number> {
  const acc: Record<string, { sum: number; n: number }> = {}
  for (const p of projects) {
    const entered = parseTs(p.stage_entered_at)
    const start = Number.isFinite(entered) ? entered : parseTs(p.created_at)
    if (!Number.isFinite(start) || start <= 0) continue
    const days = (nowMs - start) / 86400000
    const k = p.projectStatus
    if (!acc[k]) acc[k] = { sum: 0, n: 0 }
    acc[k].sum += days
    acc[k].n += 1
  }
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(acc)) {
    if (v.n > 0) out[k] = Math.round((v.sum / v.n) * 10) / 10
  }
  return out
}

type StatusAvgRow = { status: string; avgDaysInStage?: number | null }

export function mergeProjectsByStatusAvgDaysFromExplorer<T extends StatusAvgRow>(
  rows: T[],
  projects: ZenithExplorerProject[],
  nowMs = Date.now(),
): T[] {
  const map = avgDaysByStatusFromExplorer(projects, nowMs)
  return rows.map((r) => ({
    ...r,
    avgDaysInStage:
      map[r.status] != null && Number.isFinite(map[r.status]) ? map[r.status]! : (r.avgDaysInStage ?? null),
  }))
}

/** Overlay explorer avg-days onto dashboard `projectsByStatus` for funnel tooltips. */
export function overlayDashboardAvgDays(
  data: Record<string, unknown>,
  projects: ZenithExplorerProject[],
  nowMs = Date.now(),
): Record<string, unknown> {
  const rows = data.projectsByStatus
  if (!Array.isArray(rows) || projects.length === 0) return data
  return {
    ...data,
    projectsByStatus: mergeProjectsByStatusAvgDaysFromExplorer(
      rows as { status: string; avgDaysInStage?: number | null }[],
      projects,
      nowMs,
    ),
  }
}
