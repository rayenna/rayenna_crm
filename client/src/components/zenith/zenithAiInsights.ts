import { UserRole } from '../../types'
import { ProjectStatus } from '../../types'
import type { ZenithDateFilter } from './zenithTypes'

export type ZenithInsightScrollTarget =
  | 'kpis'
  | 'focus'
  | 'funnel'
  | 'charts'
  | 'sales-team'
  | 'lead-source'
  | 'loans'
  | 'segments'
  | 'proposal-engine'

export const ZENITH_SCROLL_IDS: Record<ZenithInsightScrollTarget, string> = {
  kpis: 'zenith-kpis',
  focus: 'zenith-focus',
  funnel: 'zenith-funnel',
  charts: 'zenith-charts-row-1',
  'sales-team': 'zenith-sales-team',
  'lead-source': 'zenith-lead-source',
  loans: 'zenith-loans',
  segments: 'zenith-segments',
  'proposal-engine': 'zenith-proposal-engine',
}

export interface ZenithInsight {
  id: string
  text: string
  scrollTarget: ZenithInsightScrollTarget
}

function formatInrShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (abs >= 1e5) return `₹${Math.round(n / 1e5)}L`
  if (abs >= 1e3) return `₹${Math.round(n / 1e3)}k`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function bankShortLabel(label: string): string {
  const p = label.indexOf('(')
  return (p > 0 ? label.slice(0, p).trim() : label).slice(0, 42)
}

function countByStatus(data: Record<string, unknown>, status: ProjectStatus): number {
  const list = (data?.projectsByStatus ?? []) as { status: string; count: number }[]
  return list.find((p) => p.status === status)?.count ?? 0
}

/** Approximate “stale” pipeline deals using mean days-in-stage from the dashboard. */
function countStalePipelineDeals(data: Record<string, unknown>, minDays: number): number {
  const list = (data?.projectsByStatus ?? []) as {
    status: string
    count: number
    avgDaysInStage?: number | null
  }[]
  const watch: string[] = [
    ProjectStatus.LEAD,
    ProjectStatus.SITE_SURVEY,
    ProjectStatus.PROPOSAL,
    ProjectStatus.CONFIRMED,
  ]
  let n = 0
  for (const row of list) {
    if (!watch.includes(row.status as ProjectStatus)) continue
    const d = row.avgDaysInStage
    if (d != null && Number.isFinite(d) && d >= minDays) n += row.count
  }
  return n
}

type SalesTeamRow = { salespersonName: string; totalOrderValue: number }

function pushCap(
  out: ZenithInsight[],
  id: string,
  text: string,
  target: ZenithInsightScrollTarget,
  max: number,
) {
  if (out.length >= max) return
  out.push({ id, text, scrollTarget: target })
}

/** 5–7 plain-English insights from Zenith payload (no AI API). */
export function buildZenithAiInsights(
  role: UserRole,
  data: Record<string, unknown>,
  dateFilter: ZenithDateFilter,
  options?: { salesTeamPipeline?: SalesTeamRow[] | null },
): ZenithInsight[] {
  const max = 7
  const out: ZenithInsight[] = []
  const fyRows = (data?.projectValueProfitByFY ?? []) as { fy: string; totalProjectValue: number }[]
  const sortedFy = [...fyRows].sort((a, b) => a.fy.localeCompare(b.fy))
  const singleFY = dateFilter.selectedFYs.length === 1

  const addExecutiveSalesManagement = (isSalesView: boolean) => {
    const pipeline = data?.pipeline as
      | { proposal?: number; approved?: number; atRisk?: number; survey?: number }
      | undefined

    let proposal = 0
    let confirmed = 0
    if (isSalesView && pipeline) {
      proposal = Number(pipeline.proposal ?? 0)
      confirmed = Number(pipeline.approved ?? 0)
    } else {
      proposal = countByStatus(data, ProjectStatus.PROPOSAL)
      confirmed = countByStatus(data, ProjectStatus.CONFIRMED)
    }

    if (proposal + confirmed > 0) {
      const pct = Math.round((confirmed / (proposal + confirmed)) * 100)
      pushCap(
        out,
        'conv-proposal-conf',
        `🔥 Conversion from Proposal → Confirmed is ${pct}% — industry benchmark ~45%`,
        'funnel',
        max,
      )
    }

    const stale = countStalePipelineDeals(data, 14)
    if (stale >= 1) {
      pushCap(
        out,
        'stale-pipeline',
        `⚠️ ${stale} deal${stale === 1 ? '' : 's'} have averaged 14+ days in their current stage`,
        stale >= 3 ? 'focus' : 'funnel',
        max,
      )
    }

    const atRiskOpen = isSalesView ? Number(pipeline?.atRisk ?? 0) : 0
    if (isSalesView && atRiskOpen >= 5) {
      pushCap(
        out,
        'open-pipeline',
        `📌 ${atRiskOpen} deals are in Lead / Survey / Proposal — keep the funnel moving`,
        'funnel',
        max,
      )
    }

    const prev = data?.previousYearSamePeriod as
      | { totalRevenue?: number; totalPipeline?: number }
      | null
      | undefined
    let currentRev = 0
    if (isSalesView) {
      currentRev = Number((data?.revenue as { totalRevenue?: number })?.totalRevenue ?? 0)
    } else {
      currentRev = Number((data?.finance as { totalValue?: number })?.totalValue ?? 0)
    }
    if (singleFY && prev?.totalRevenue != null && prev.totalRevenue > 0) {
      const ch = ((currentRev - prev.totalRevenue) / prev.totalRevenue) * 100
      if (Math.abs(ch) >= 1) {
        pushCap(
          out,
          'rev-yoy',
          `✅ Revenue is ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(0)}% vs same period last year`,
          'kpis',
          max,
        )
      }
    } else if (sortedFy.length >= 2) {
      const last = sortedFy[sortedFy.length - 1]!
      const prevFy = sortedFy[sortedFy.length - 2]!
      if (prevFy.totalProjectValue > 0) {
        const ch = ((last.totalProjectValue - prevFy.totalProjectValue) / prevFy.totalProjectValue) * 100
        if (Math.abs(ch) >= 2) {
          pushCap(
            out,
            'rev-fy',
            `✅ Booked value is ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(0)}% vs prior FY (${prevFy.fy} → ${last.fy})`,
            'kpis',
            max,
          )
        }
      }
    }

    const team = options?.salesTeamPipeline ?? []
    if (team.length > 0) {
      const top = [...team].sort((a, b) => b.totalOrderValue - a.totalOrderValue)[0]!
      if (top.totalOrderValue >= 100000) {
        pushCap(
          out,
          'top-pipeline',
          `⚡ ${top.salespersonName} has ${formatInrShort(top.totalOrderValue)} in pipeline — highest on the team`,
          'sales-team',
          max,
        )
      }
    }

    const revBySp = (data?.revenueBySalesperson ?? []) as {
      salespersonName: string
      revenue: number
    }[]
    if (!team.length && revBySp.length > 0) {
      const topR = [...revBySp].sort((a, b) => b.revenue - a.revenue)[0]!
      if (topR.revenue >= 100000) {
        pushCap(
          out,
          'top-revenue',
          `⚡ ${topR.salespersonName} leads booked revenue at ${formatInrShort(topR.revenue)}`,
          'sales-team',
          max,
        )
      }
    }

    const loans = (data?.availingLoanByBank ?? []) as { bankLabel: string; count: number }[]
    const loanTotal = loans.reduce((s, x) => s + x.count, 0)
    if (loanTotal >= 3 && loans.length > 0) {
      const topB = [...loans].sort((a, b) => b.count - a.count)[0]!
      if (topB.count >= 2) {
        pushCap(
          out,
          'loan-bank',
          `🏦 ${topB.count} of ${loanTotal} loan project${loanTotal === 1 ? '' : 's'} are with ${bankShortLabel(topB.bankLabel)}`,
          'loans',
          max,
        )
      }
    }

    const seg = (data?.projectValueByType ?? []) as { label: string; percentage: string }[]
    if (seg.length >= 2) {
      const topS = [...seg].sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))[0]
      if (topS && parseFloat(topS.percentage) >= 25) {
        pushCap(
          out,
          'segment',
          `📊 ${topS.label} is ${topS.percentage} of revenue mix — see segments below`,
          'segments',
          max,
        )
      }
    }

    if (!isSalesView && (role === UserRole.MANAGEMENT || role === UserRole.ADMIN)) {
      const leads = Number((data?.sales as { totalLeads?: number })?.totalLeads ?? 0)
      if (leads >= 10) {
        pushCap(out, 'leads-vol', `🧭 ${leads} active leads in scope — tune sources in the charts`, 'lead-source', max)
      }
    }
  }

  if (role === UserRole.SALES || role === UserRole.MANAGEMENT || role === UserRole.ADMIN) {
    addExecutiveSalesManagement(role === UserRole.SALES)
    if (out.length < 6) {
      pushCap(
        out,
        'proposal-pe',
        `🛰️ Proposal Engine status lives below the funnel for eligible projects`,
        'proposal-engine',
        max,
      )
    }
  }

  if (role === UserRole.FINANCE) {
    const outAmt = Number(data?.totalOutstanding ?? 0)
    const tv = Number(data?.totalProjectValue ?? 0)
    if (tv > 0 && outAmt > 0) {
      const pct = Math.round((outAmt / tv) * 100)
      pushCap(
        out,
        'fin-out',
        `💰 ${formatInrShort(outAmt)} outstanding (${pct}% of booked value) — collections drive cash flow`,
        'kpis',
        max,
      )
    }
    const prevF = data?.previousYearFinanceKpis as { totalProjectValue?: number } | null | undefined
    if (singleFY && prevF?.totalProjectValue != null && prevF.totalProjectValue > 0 && tv > 0) {
      const ch = ((tv - prevF.totalProjectValue) / prevF.totalProjectValue) * 100
      if (Math.abs(ch) >= 2) {
        pushCap(
          out,
          'fin-yoy',
          `✅ Booked project value is ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(0)}% vs same period last year`,
          'kpis',
          max,
        )
      }
    }
    const loans = (data?.availingLoanByBank ?? []) as { bankLabel: string; count: number }[]
    const loanN = Number(data?.availingLoanCount ?? 0)
    const loanTotal = loans.reduce((s, x) => s + x.count, 0) || loanN
    if (loanTotal >= 3 && loans.length > 0) {
      const topB = [...loans].sort((a, b) => b.count - a.count)[0]!
      pushCap(
        out,
        'fin-loan',
        `🏦 ${topB.count} of ${loanTotal} loan project${loanTotal === 1 ? '' : 's'} are with ${bankShortLabel(topB.bankLabel)}`,
        'loans',
        max,
      )
    }
    const pay = (data?.projectsByPaymentStatus ?? []) as { status: string; count: number }[]
    const partial = pay.find((p) => p.status === 'PARTIAL')?.count ?? 0
    if (partial >= 3) {
      pushCap(out, 'fin-partial', `⏳ ${partial} projects are partially paid — worth a finance pass`, 'funnel', max)
    }
  }

  if (role === UserRole.OPERATIONS) {
    const pend = Number(data?.pendingInstallation ?? 0)
    const done = Number(data?.completedInstallation ?? 0)
    if (pend >= 1) {
      pushCap(
        out,
        'ops-pend',
        `🔧 ${pend} project${pend === 1 ? '' : 's'} pending installation — execution funnel below`,
        'funnel',
        max,
      )
    }
    if (done > 0 && pend > 0 && done >= pend) {
      pushCap(
        out,
        'ops-throughput',
        `✅ Installations completed (${done}) outpace pending (${pend}) in this view`,
        'charts',
        max,
      )
    }
    const subsidy = Number(data?.subsidyCredited ?? 0)
    if (subsidy >= 5) {
      pushCap(out, 'ops-subsidy', `🌿 ${subsidy} subsidy credits recorded — strong closure cadence`, 'charts', max)
    }
  }

  if (out.length < 5) {
    pushCap(
      out,
      'fallback-charts',
      `💡 Tip: Use FY / quarter filters to sharpen every tile on this screen`,
      'kpis',
      max,
    )
  }

  return out.slice(0, max)
}
