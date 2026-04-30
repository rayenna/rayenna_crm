import { UserRole } from '../../types'
import type { ZenithFYRow } from './zenithTypes'

export type KpiFormat = 'currency' | 'capacity' | 'percent' | 'number'

export interface ZenithKpiItem {
  key: string
  label: string
  value: number
  format: KpiFormat
  /** % change vs previous period; null = N/A */
  changePct: number | null
  sparkline: number[]
}

function getPreviousFY(fy: string): string {
  const s = String(fy).trim()
  const twoDigit = s.match(/^(\d{4})-(\d{2})$/)
  if (twoDigit) {
    const start = parseInt(twoDigit[1], 10)
    const end = parseInt(twoDigit[2], 10)
    return `${start - 1}-${String(end - 1).padStart(2, '0')}`
  }
  const fourDigit = s.match(/^(\d{4})-(\d{4})$/)
  if (fourDigit) {
    const start = parseInt(fourDigit[1], 10)
    const end = parseInt(fourDigit[2], 10)
    return `${start - 1}-${end - 1}`
  }
  return ''
}

function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function fySparkline(rows: ZenithFYRow[], pick: (r: ZenithFYRow) => number): number[] {
  const sorted = [...rows].sort((a, b) => a.fy.localeCompare(b.fy))
  const last = sorted.slice(-7)
  const vals = last.map((r) => pick(r))
  while (vals.length < 7) {
    vals.unshift(vals[0] ?? 0)
  }
  return vals.slice(-7)
}

interface PrevPeriod {
  totalCapacity: number
  totalPipeline: number
  totalRevenue: number
  totalProfit: number
}

/** Optional; Finance dashboard only — used for loan YoY when present */
interface ExecutiveOptionalFinancePrev {
  availingLoanCount?: number
}

/** Build 6 KPIs for Sales / Management / Admin Zenith strip (includes Availing Loan, same as Finance tile). */
export function buildExecutiveZenithKpis(
  role: UserRole,
  data: Record<string, unknown>,
  selectedFYs: string[],
): ZenithKpiItem[] {
  const rows = (data?.projectValueProfitByFY ?? []) as ZenithFYRow[]
  const singleFY = selectedFYs.length === 1 ? selectedFYs[0]! : null
  const prevPeriod = data?.previousYearSamePeriod as PrevPeriod | null | undefined
  const usePeriodYoY = singleFY && prevPeriod != null

  let capacity = 0
  let pipeline = 0
  let revenue = 0
  let profit: number | null = 0

  if (role === UserRole.SALES) {
    capacity = Number((data?.revenue as { totalCapacity?: number })?.totalCapacity ?? 0)
    pipeline = Number(data?.totalPipeline ?? 0)
    revenue = Number((data?.revenue as { totalRevenue?: number })?.totalRevenue ?? 0)
    profit = data?.totalProfit != null ? Number(data.totalProfit) : null
  } else {
    capacity = Number((data?.sales as { totalCapacity?: number })?.totalCapacity ?? 0)
    pipeline = Number(data?.totalPipeline ?? 0)
    revenue = Number((data?.finance as { totalValue?: number })?.totalValue ?? 0)
    profit =
      (data?.finance as { totalProfit?: number | null })?.totalProfit != null
        ? Number((data.finance as { totalProfit: number }).totalProfit)
        : null
  }

  let capPrev: number | undefined
  let pipePrev: number | undefined
  let revPrev: number | undefined
  let profPrev: number | undefined

  if (usePeriodYoY && prevPeriod) {
    capPrev = prevPeriod.totalCapacity
    pipePrev = prevPeriod.totalPipeline
    revPrev = prevPeriod.totalRevenue
    profPrev = prevPeriod.totalProfit
  } else if (singleFY) {
    const prevLabel = getPreviousFY(singleFY)
    const prevRow = prevLabel ? rows.find((r) => r.fy === prevLabel) : undefined
    revPrev = prevRow?.totalProjectValue
    profPrev = prevRow?.totalProfit ?? undefined
    capPrev = prevRow?.totalCapacity
    pipePrev = prevRow?.totalPipeline
  }

  const conversion = pipeline > 0 ? (revenue / pipeline) * 100 : null
  const convPrev =
    pipePrev != null && pipePrev > 0 && revPrev != null ? (revPrev / pipePrev) * 100 : null

  const singleFYSelected = selectedFYs.length === 1
  const convChange =
    conversion != null && singleFYSelected ? pctChange(conversion, convPrev) : null

  const loanCountApi = data?.availingLoanCount
  const loansByBank = (data?.availingLoanByBank ?? []) as { count?: number }[]
  const loanSumFromBanks = loansByBank.reduce((s, x) => s + (Number(x.count) || 0), 0)
  const loans =
    loanCountApi != null && loanCountApi !== ''
      ? Number(loanCountApi)
      : loanSumFromBanks

  const prevFinLoans = (data?.previousYearFinanceKpis as ExecutiveOptionalFinancePrev | null | undefined)
    ?.availingLoanCount
  const loanChangePct =
    singleFYSelected && prevFinLoans != null ? pctChange(loans, prevFinLoans) : null

  const showLostKpi = role === UserRole.ADMIN || role === UserRole.MANAGEMENT
  const lost = showLostKpi ? Number(data?.lostProjectsCount ?? 0) : 0

  const base: ZenithKpiItem[] = [
    {
      key: 'capacity',
      label: 'Total Capacity',
      value: capacity,
      format: 'capacity',
      changePct: singleFYSelected ? pctChange(capacity, capPrev) : null,
      sparkline: fySparkline(rows, (r) => r.totalCapacity ?? r.totalProjectValue ?? 0),
    },
    {
      key: 'pipeline',
      label: 'Total Pipeline',
      value: pipeline,
      format: 'currency',
      changePct: singleFYSelected ? pctChange(pipeline, pipePrev) : null,
      sparkline: fySparkline(rows, (r) => r.totalPipeline ?? r.totalProjectValue ?? 0),
    },
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: revenue,
      format: 'currency',
      changePct: singleFYSelected ? pctChange(revenue, revPrev) : null,
      sparkline: fySparkline(rows, (r) => r.totalProjectValue ?? 0),
    },
    {
      key: 'profit',
      label: 'Total Profit',
      value: profit ?? 0,
      format: 'currency',
      changePct:
        singleFYSelected && profit != null ? pctChange(profit, profPrev ?? undefined) : null,
      sparkline: fySparkline(rows, (r) => r.totalProfit ?? 0),
    },
    {
      key: 'conversion',
      label: 'Pipeline Conversion',
      value: conversion ?? 0,
      format: 'percent',
      changePct: convChange,
      sparkline: fySparkline(rows, (r) => {
        const p = r.totalPipeline ?? 0
        const rev = r.totalProjectValue ?? 0
        return p > 0 ? (rev / p) * 100 : 0
      }),
    },
    {
      key: 'loan',
      label: 'Availing Loan',
      value: loans,
      format: 'number',
      changePct: loanChangePct,
      sparkline: fySparkline(rows, () => loans),
    },
  ]

  if (showLostKpi) {
    base.push({
      key: 'lost',
      label: 'Lost Projects',
      value: lost,
      format: 'number',
      changePct: null,
      sparkline: fySparkline(rows, () => lost),
    })
  }

  return base
}

interface OperationsPrevKpis {
  pendingInstallation: number
  completedInstallation: number
  subsidyCredited: number
  confirmedRevenue: number
}

export function buildOperationsZenithKpis(
  data: Record<string, unknown>,
  selectedFYs: string[],
): ZenithKpiItem[] {
  const rows = (data?.projectValueProfitByFY ?? []) as ZenithFYRow[]
  const confirmedRevenue = Number(
    data?.confirmedOrderRevenue ?? data?.confirmedRevenue ?? 0,
  )
  const singleFY = selectedFYs.length === 1
  const prev = data?.previousYearOperationsKpis as OperationsPrevKpis | null | undefined

  const pend = Number(data?.pendingInstallation ?? 0)
  const done = Number(data?.completedInstallation ?? 0)
  const cred = Number(data?.subsidyCredited ?? 0)

  return [
    {
      key: 'pend',
      label: 'Pending Installation',
      value: pend,
      format: 'number',
      changePct: singleFY && prev ? pctChange(pend, prev.pendingInstallation) : null,
      sparkline: fySparkline(rows, () => pend),
    },
    {
      key: 'done',
      label: 'Completed Installation',
      value: done,
      format: 'number',
      changePct: singleFY && prev ? pctChange(done, prev.completedInstallation) : null,
      sparkline: fySparkline(rows, () => done),
    },
    {
      key: 'cred',
      label: 'Subsidy Credited',
      value: cred,
      format: 'number',
      changePct: singleFY && prev ? pctChange(cred, prev.subsidyCredited) : null,
      sparkline: fySparkline(rows, () => cred),
    },
    {
      key: 'vol',
      label: 'Confirmed Revenue',
      value: confirmedRevenue,
      format: 'currency',
      changePct: singleFY && prev ? pctChange(confirmedRevenue, prev.confirmedRevenue) : null,
      sparkline: fySparkline(rows, (r) => r.totalProjectValue ?? 0),
    },
  ]
}

interface FinancePrevKpis {
  totalProjectValue: number
  totalAmountReceived: number
  totalOutstanding: number
  totalProfit: number
  availingLoanCount: number
}

export function buildFinanceZenithKpis(
  data: Record<string, unknown>,
  selectedFYs: string[],
): ZenithKpiItem[] {
  const rows = (data?.projectValueProfitByFY ?? []) as ZenithFYRow[]
  const singleFY = selectedFYs.length === 1
  const prev = data?.previousYearFinanceKpis as FinancePrevKpis | null | undefined

  const totalPV = Number(data?.totalProjectValue ?? 0)
  const totalRecv = Number(data?.totalAmountReceived ?? 0)
  const totalOut = Number(data?.totalOutstanding ?? 0)
  const totalProfit = Number(data?.totalGrossProfit ?? 0)
  const loans = Number(data?.availingLoanCount ?? 0)

  return [
    {
      key: 'rev',
      label: 'Total Revenue',
      value: totalPV,
      format: 'currency',
      changePct: singleFY && prev ? pctChange(totalPV, prev.totalProjectValue) : null,
      sparkline: fySparkline(rows, (r) => r.totalProjectValue ?? 0),
    },
    {
      key: 'recv',
      label: 'Amount Received',
      value: totalRecv,
      format: 'currency',
      changePct: singleFY && prev ? pctChange(totalRecv, prev.totalAmountReceived) : null,
      sparkline: fySparkline(rows, (r) => r.totalProjectValue ?? 0),
    },
    {
      key: 'out',
      label: 'Outstanding',
      value: totalOut,
      format: 'currency',
      changePct: singleFY && prev ? pctChange(totalOut, prev.totalOutstanding) : null,
      sparkline: fySparkline(rows, () => totalOut),
    },
    {
      key: 'prof',
      label: 'Total Profit',
      value: totalProfit,
      format: 'currency',
      changePct: singleFY && prev ? pctChange(totalProfit, prev.totalProfit) : null,
      sparkline: fySparkline(rows, (r) => r.totalProfit ?? 0),
    },
    {
      key: 'loan',
      label: 'Availing Loan',
      value: loans,
      format: 'number',
      changePct: singleFY && prev ? pctChange(loans, prev.availingLoanCount) : null,
      sparkline: fySparkline(rows, () => loans),
    },
  ]
}
