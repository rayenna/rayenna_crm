/**
 * Collections & Cash report — outstanding aging, loan-stuck, subsidy in flight.
 * KEEP UI copy in sync with client/src/help/content/modules/reports.md
 */

import { calculateFYInIst, calendarYmdInTimeZone } from './istCalendar'
import {
  SALES_REVIEW_CUSTOMER_TYPE_LABELS,
  SALES_REVIEW_SEGMENT_LABELS,
  SALES_REVIEW_STATUS_LABELS,
} from './salesReview'

export const COLLECTIONS_PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  FULLY_PAID: 'Fully Paid',
}

/** Confirmed-and-beyond only. Lead / Survey / Proposal stay pipeline, not collectible. */
export const COLLECTIONS_STATUSES = [
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'SUBMITTED_FOR_SUBSIDY',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
] as const

const COLLECTIONS_SET = new Set<string>(COLLECTIONS_STATUSES)

export const AGING_KEYS = ['b0_30', 'b31_60', 'b61_90', 'b90', 'undated'] as const
export type AgingKey = (typeof AGING_KEYS)[number]

export const AGING_LABELS: Record<AgingKey, string> = {
  b0_30: '0–30',
  b31_60: '31–60',
  b61_90: '61–90',
  b90: '90+',
  undated: 'Undated',
}

export type CollectionsProjectInput = {
  id: string
  slNo: number | null
  projectStatus: string
  year: string
  type: string | null
  projectCost: number | null
  balanceAmount: number | null
  totalAmountReceived: number | null
  paymentStatus: string | null
  confirmationDate: Date | string | null
  lastPaymentDate: Date | string | null
  availingLoan: boolean | null
  financingBank: string | null
  financingBankOther: string | null
  subsidyRequestDate: Date | string | null
  subsidyCreditedDate: Date | string | null
  salespersonId: string | null
  salespersonName: string | null
  customerName: string | null
  customerType: string | null
}

export type CollectionsRow = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  salespersonId: string | null
  stage: string
  stageStatus: string
  customerType: string | null
  customerTypeLabel: string
  segment: string | null
  segmentLabel: string
  paymentStatus: string | null
  paymentStatusLabel: string
  orderValue: number
  received: number
  balance: number
  lastPaymentDate: string | null
  daysOutstanding: number | null
  agingBucket: AgingKey
  agingLabel: string
  availingLoan: boolean
  bankLabel: string
  subsidyInFlight: boolean
  neverPaid: boolean
  flags: string[]
  flagLabels: string[]
}

export type AgingRow = {
  key: 'jobs' | 'balance'
  label: string
  values: number[]
  total: number
}

export type SellerLoadRow = {
  salespersonId: string | null
  salespersonName: string
  jobs: number
  outstanding: number
  aging90: number
  loan: number
  neverPaid: number
}

export type CollectionsCashKpis = {
  outstandingJobs: number
  outstanding: number
  receivedOnBook: number
  aging90Jobs: number
  aging90: number
  neverPaidJobs: number
  loanJobs: number
  loanOutstanding: number
  cashOutstanding: number
  subsidyInFlightJobs: number
  subsidyInFlightValue: number
  pendingJobs: number
  partialJobs: number
}

export type CollectionsCashPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  aging: {
    columns: { key: AgingKey; label: string }[]
    rows: AgingRow[]
  }
  sellerLoad: SellerLoadRow[]
  rows: CollectionsRow[]
  kpis: CollectionsCashKpis
}

function num(v: number | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function roundMoney(n: number): number {
  return Math.round(n)
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function ymdOfField(v: Date | string | null | undefined): string | null {
  const d = toDate(v)
  return d ? calendarYmdInTimeZone(d) : null
}

function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const [ay, am, ad] = fromYmd.split('-').map(Number)
  const [by, bm, bd] = toYmd.split('-').map(Number)
  const ua = Date.UTC(ay, am - 1, ad)
  const ub = Date.UTC(by, bm - 1, bd)
  return Math.round((ub - ua) / 86_400_000)
}

export function agingBucket(days: number | null): AgingKey {
  if (days == null) return 'undated'
  if (days <= 30) return 'b0_30'
  if (days <= 60) return 'b31_60'
  if (days <= 90) return 'b61_90'
  return 'b90'
}

export function isSubsidyInFlight(p: CollectionsProjectInput): boolean {
  if (p.type !== 'SUBSIDY') return false
  if (!COLLECTIONS_SET.has(p.projectStatus)) return false
  if (p.projectStatus === 'COMPLETED_SUBSIDY_CREDITED') return false
  if (p.subsidyCreditedDate) return false
  if (p.subsidyRequestDate) return true
  return p.projectStatus === 'SUBMITTED_FOR_SUBSIDY' || p.projectStatus === 'COMPLETED'
}

export function isOnCollectionsBook(p: CollectionsProjectInput): boolean {
  if (!COLLECTIONS_SET.has(p.projectStatus)) return false
  return num(p.balanceAmount) > 0 || isSubsidyInFlight(p)
}

function bankLabel(p: CollectionsProjectInput): string {
  if (p.availingLoan !== true) return '—'
  const named = (p.financingBankOther || p.financingBank || '').trim()
  return named || 'Loan'
}

const FLAG_LABELS: Record<string, string> = {
  never_paid: 'Advance due',
  installment: 'Next installment',
  loan: 'Loan',
  subsidy: 'Subsidy in flight',
  aging_90: '90+ days',
}

export function buildCollectionsCash(
  projects: CollectionsProjectInput[],
  now: Date = new Date(),
): CollectionsCashPayload {
  const todayYmd = calendarYmdInTimeZone(now)
  const currentFy = calculateFYInIst(now) || '2026-27'

  const rows: CollectionsRow[] = []
  for (const p of projects) {
    if (!isOnCollectionsBook(p)) continue
    const balance = roundMoney(num(p.balanceAmount))
    const received = roundMoney(num(p.totalAmountReceived))
    const lastPay = ymdOfField(p.lastPaymentDate)
    const anchor = lastPay ?? ymdOfField(p.confirmationDate)
    const daysOutstanding = anchor ? daysBetweenYmd(anchor, todayYmd) : null
    const bucket = agingBucket(daysOutstanding)
    const loan = p.availingLoan === true
    const subsidy = isSubsidyInFlight(p)
    const neverPaid = balance > 0 && (p.paymentStatus === 'PENDING' || !p.paymentStatus) && !lastPay && received <= 0
    const flags: string[] = []
    if (neverPaid) flags.push('never_paid')
    else if (balance > 0 && p.paymentStatus === 'PARTIAL') flags.push('installment')
    if (loan && balance > 0) flags.push('loan')
    if (subsidy) flags.push('subsidy')
    if (balance > 0 && bucket === 'b90') flags.push('aging_90')

    rows.push({
      id: p.id,
      slNo: p.slNo,
      customerName: p.customerName?.trim() || (p.slNo != null ? `#${p.slNo}` : 'Untitled'),
      salespersonName: p.salespersonName,
      salespersonId: p.salespersonId,
      stage: SALES_REVIEW_STATUS_LABELS[p.projectStatus] || p.projectStatus,
      stageStatus: p.projectStatus,
      customerType: p.customerType,
      customerTypeLabel: SALES_REVIEW_CUSTOMER_TYPE_LABELS[p.customerType || ''] || p.customerType || '—',
      segment: p.type,
      segmentLabel: SALES_REVIEW_SEGMENT_LABELS[p.type || ''] || p.type || '—',
      paymentStatus: p.paymentStatus,
      paymentStatusLabel: COLLECTIONS_PAYMENT_LABELS[p.paymentStatus || ''] || p.paymentStatus || '—',
      orderValue: roundMoney(num(p.projectCost)),
      received,
      balance,
      lastPaymentDate: lastPay,
      daysOutstanding,
      agingBucket: bucket,
      agingLabel: AGING_LABELS[bucket],
      availingLoan: loan,
      bankLabel: bankLabel(p),
      subsidyInFlight: subsidy,
      neverPaid,
      flags,
      flagLabels: flags.map((id) => FLAG_LABELS[id] || id),
    })
  }

  rows.sort((a, b) => {
    if (a.balance !== b.balance) return b.balance - a.balance
    return (b.daysOutstanding || 0) - (a.daysOutstanding || 0)
  })

  const agingAcc: Record<AgingKey, { jobs: number; balance: number }> = {
    b0_30: { jobs: 0, balance: 0 },
    b31_60: { jobs: 0, balance: 0 },
    b61_90: { jobs: 0, balance: 0 },
    b90: { jobs: 0, balance: 0 },
    undated: { jobs: 0, balance: 0 },
  }
  for (const row of rows) {
    if (row.balance <= 0) continue
    agingAcc[row.agingBucket].jobs += 1
    agingAcc[row.agingBucket].balance += row.balance
  }

  const agingRows: AgingRow[] = [
    {
      key: 'jobs',
      label: 'Jobs',
      values: AGING_KEYS.map((k) => agingAcc[k].jobs),
      total: AGING_KEYS.reduce((s, k) => s + agingAcc[k].jobs, 0),
    },
    {
      key: 'balance',
      label: 'Outstanding',
      values: AGING_KEYS.map((k) => roundMoney(agingAcc[k].balance)),
      total: roundMoney(AGING_KEYS.reduce((s, k) => s + agingAcc[k].balance, 0)),
    },
  ]

  const loadMap = new Map<string, SellerLoadRow>()
  const unassignedKey = '__unassigned__'
  for (const row of rows) {
    const key = row.salespersonId || unassignedKey
    let rec = loadMap.get(key)
    if (!rec) {
      rec = {
        salespersonId: row.salespersonId,
        salespersonName: row.salespersonId ? row.salespersonName?.trim() || 'Seller' : 'Unassigned',
        jobs: 0,
        outstanding: 0,
        aging90: 0,
        loan: 0,
        neverPaid: 0,
      }
      loadMap.set(key, rec)
    }
    rec.jobs += 1
    rec.outstanding += row.balance
    if (row.balance > 0 && row.agingBucket === 'b90') rec.aging90 += row.balance
    if (row.availingLoan && row.balance > 0) rec.loan += row.balance
    if (row.neverPaid) rec.neverPaid += 1
  }
  const sellerLoad = Array.from(loadMap.values()).sort((a, b) => {
    const aUn = a.salespersonId ? 0 : 1
    const bUn = b.salespersonId ? 0 : 1
    if (aUn !== bUn) return aUn - bUn
    return b.outstanding - a.outstanding || a.salespersonName.localeCompare(b.salespersonName)
  })

  const outstandingRows = rows.filter((r) => r.balance > 0)
  const loanRows = outstandingRows.filter((r) => r.availingLoan)
  const cashRows = outstandingRows.filter((r) => !r.availingLoan)
  const subsidyRows = rows.filter((r) => r.subsidyInFlight)
  const aging90Rows = outstandingRows.filter((r) => r.agingBucket === 'b90')

  return {
    generatedAt: now.toISOString(),
    salespersonId: null,
    currentFy,
    aging: {
      columns: AGING_KEYS.map((key) => ({ key, label: AGING_LABELS[key] })),
      rows: agingRows,
    },
    sellerLoad,
    rows,
    kpis: {
      outstandingJobs: outstandingRows.length,
      outstanding: roundMoney(outstandingRows.reduce((s, r) => s + r.balance, 0)),
      receivedOnBook: roundMoney(outstandingRows.reduce((s, r) => s + r.received, 0)),
      aging90Jobs: aging90Rows.length,
      aging90: roundMoney(aging90Rows.reduce((s, r) => s + r.balance, 0)),
      neverPaidJobs: outstandingRows.filter((r) => r.neverPaid).length,
      loanJobs: loanRows.length,
      loanOutstanding: roundMoney(loanRows.reduce((s, r) => s + r.balance, 0)),
      cashOutstanding: roundMoney(cashRows.reduce((s, r) => s + r.balance, 0)),
      subsidyInFlightJobs: subsidyRows.length,
      subsidyInFlightValue: roundMoney(subsidyRows.reduce((s, r) => s + r.orderValue, 0)),
      pendingJobs: outstandingRows.filter((r) => r.paymentStatus === 'PENDING').length,
      partialJobs: outstandingRows.filter((r) => r.paymentStatus === 'PARTIAL').length,
    },
  }
}
