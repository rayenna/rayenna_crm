/**
 * Delivery Control report — in-flight confirmed jobs, commissioning board, ops load, blockers.
 * Indian FY (Apr–Mar). KEEP UI copy in sync with client/src/help/content/modules/reports.md
 */

import { calculateFYInIst, calendarYmdInTimeZone } from './istCalendar'
import {
  forecastQuarterColumns,
  indianFyQuarterFromMonth,
  SALES_REVIEW_CUSTOMER_TYPE_LABELS,
  SALES_REVIEW_SEGMENT_LABELS,
  SALES_REVIEW_STATUS_LABELS,
  SALES_REVIEW_SYSTEM_TYPE_LABELS,
  type ForecastQuarterCol,
} from './salesReview'

export const DELIVERY_CONTROL_STATUSES = [
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'SUBMITTED_FOR_SUBSIDY',
] as const

const DELIVERY_SET = new Set<string>(DELIVERY_CONTROL_STATUSES)

/** Confirmed-and-beyond subsidy jobs, including Completed until credit lands. */
export const SUBSIDY_CLOCK_STATUSES = [
  ...DELIVERY_CONTROL_STATUSES,
  'COMPLETED',
] as const

const SUBSIDY_CLOCK_SET = new Set<string>(SUBSIDY_CLOCK_STATUSES)

export const SUBSIDY_CLOCK_STEPS = [
  'kseb_feasibility',
  'kseb_registration',
  'install',
  'mnre_portal',
  'completion_report',
  'request',
  'awaiting_credit',
] as const
export type SubsidyClockStep = (typeof SUBSIDY_CLOCK_STEPS)[number]

export const SUBSIDY_CLOCK_STEP_LABELS: Record<SubsidyClockStep, string> = {
  kseb_feasibility: 'KSEB feasibility',
  kseb_registration: 'KSEB registration',
  install: 'Installing',
  mnre_portal: 'MNRE portal',
  completion_report: 'Completion report',
  request: 'Request not filed',
  awaiting_credit: 'Awaiting credit',
}

export const SUBSIDY_CLOCK_EXCEPTION_LABELS: Record<string, string> = {
  reversed_dates: 'Dates out of order',
  completed_not_requested: 'Completed, not requested',
  submitted_not_requested: 'Submitted, not requested',
  status_ahead: 'Status ahead of dates',
}

export const DELIVERY_BLOCKER_LABELS: Record<string, string> = {
  overdue: 'Overdue commissioning',
  no_date: 'No commissioning date',
  unassigned: 'Unassigned ops',
  no_feasibility: 'No KSEB feasibility',
  no_kseb_reg: 'KSEB registration pending',
  no_mnre: 'MNRE portal pending',
  no_cr: 'Completion report pending',
  no_kseb_doc: 'No KSEB document',
  no_mnre_doc: 'No MNRE document',
}

const PROCESS_BLOCKERS = new Set([
  'no_feasibility',
  'no_kseb_reg',
  'no_mnre',
  'no_cr',
  'no_kseb_doc',
  'no_mnre_doc',
])

export type DeliveryControlProjectInput = {
  id: string
  slNo: number | null
  projectStatus: string
  year: string
  projectCost: number | null
  systemCapacity: number | null
  systemType: string | null
  type: string | null
  confirmationDate: Date | string | null
  expectedCommissioningDate: Date | string | null
  stageEnteredAt: Date | string | null
  feasibilityDate: Date | string | null
  registrationDate: Date | string | null
  mnrePortalRegistrationDate: Date | string | null
  installationCompletionDate: Date | string | null
  completionReportSubmissionDate: Date | string | null
  subsidyRequestDate: Date | string | null
  subsidyCreditedDate: Date | string | null
  incentiveEligible: boolean | null
  assignedOpsId: string | null
  opsPersonName: string | null
  salespersonId: string | null
  salespersonName: string | null
  customerName: string | null
  customerType: string | null
  documentCategories: string[]
}

export type DeliveryJob = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  opsPersonName: string | null
  assignedOpsId: string | null
  stage: string
  stageStatus: string
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  commissionDate: string | null
  quarter: string | null
  fy: string | null
  orderValue: number
  capacityKw: number | null
  daysLate: number | null
  daysInStage: number | null
  pastDue: boolean
  unscheduled: boolean
  unassignedOps: boolean
  forecastBucket: 'CQ' | 'NQ' | 'NQ1' | 'NQ2' | 'later' | 'unscheduled'
  blockers: string[]
  blockerLabels: string[]
}

export type DeliveryBoardRow = {
  key: 'jobs' | 'capacityKw' | 'value' | 'overdue'
  label: string
  values: number[]
  total: number
}

export type DeliveryOpsLoadRow = {
  opsPersonId: string | null
  opsPersonName: string
  jobs: number
  capacityKw: number
  orderValue: number
  overdue: number
  blocked: number
}

export type DeliveryControlKpis = {
  inDeliveryJobs: number
  inDeliveryValue: number
  inDeliveryKw: number
  confirmedJobs: number
  installingJobs: number
  subsidyJobs: number
  overdueJobs: number
  unscheduledJobs: number
  unassignedJobs: number
  blockedJobs: number
}

export type SubsidyClockJob = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  opsPersonName: string | null
  assignedOpsId: string | null
  stage: string
  stageStatus: string
  step: SubsidyClockStep
  stepLabel: string
  daysInStep: number | null
  orderValue: number
  capacityKw: number | null
  requestDate: string | null
  exceptions: string[]
  exceptionLabels: string[]
}

export type SubsidyClockFunnelRow = {
  key: 'jobs' | 'capacityKw' | 'value' | 'medianDays'
  label: string
  values: number[]
  total: number
}

export type SubsidyClockKpis = {
  onClockJobs: number
  onClockValue: number
  onClockKw: number
  awaitingCreditJobs: number
  awaitingCreditValue: number
  completedNotCreditedJobs: number
  stale90Jobs: number
  exceptionJobs: number
}

export type DeliveryControlPayload = {
  generatedAt: string
  opsPersonId: string | null
  currentFy: string
  board: {
    columns: ForecastQuarterCol[]
    rows: DeliveryBoardRow[]
    unscheduledJobs: number
    unscheduledValue: number
    unscheduledKw: number
    laterJobs: number
    laterValue: number
    laterKw: number
  }
  opsLoad: DeliveryOpsLoadRow[]
  jobs: DeliveryJob[]
  kpis: DeliveryControlKpis
  subsidyClock: {
    columns: Array<{ key: SubsidyClockStep; label: string }>
    rows: SubsidyClockFunnelRow[]
    jobs: SubsidyClockJob[]
    kpis: SubsidyClockKpis
  }
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

function num(v: number | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function roundMoney(n: number): number {
  return Math.round(n)
}

function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const [ay, am, ad] = fromYmd.split('-').map(Number)
  const [by, bm, bd] = toYmd.split('-').map(Number)
  const ua = Date.UTC(ay, am - 1, ad)
  const ub = Date.UTC(by, bm - 1, bd)
  return Math.round((ub - ua) / 86_400_000)
}

function hasDoc(categories: string[], needle: string): boolean {
  return categories.some((c) => String(c).trim().toLowerCase() === needle)
}

export function jobBlockers(p: DeliveryControlProjectInput, todayYmd: string): string[] {
  const flags: string[] = []
  const comm = ymdOfField(p.expectedCommissioningDate)
  if (!comm) flags.push('no_date')
  else if (comm < todayYmd) flags.push('overdue')
  if (!p.assignedOpsId) flags.push('unassigned')

  const subsidy = p.type === 'SUBSIDY'
  if (subsidy && !p.feasibilityDate) flags.push('no_feasibility')
  else if (subsidy && p.feasibilityDate && !p.registrationDate) flags.push('no_kseb_reg')

  const pastConfirmed =
    p.projectStatus === 'UNDER_INSTALLATION' ||
    p.projectStatus === 'SUBMITTED_FOR_SUBSIDY' ||
    Boolean(p.installationCompletionDate)
  if (subsidy && pastConfirmed && !p.mnrePortalRegistrationDate) flags.push('no_mnre')

  if (p.installationCompletionDate && !p.completionReportSubmissionDate) flags.push('no_cr')

  const cats = p.documentCategories || []
  if (subsidy && !hasDoc(cats, 'kseb')) flags.push('no_kseb_doc')
  if (subsidy && pastConfirmed && !hasDoc(cats, 'mnre')) flags.push('no_mnre_doc')

  return flags
}

export function isOnSubsidyClock(p: DeliveryControlProjectInput): boolean {
  if (p.type !== 'SUBSIDY') return false
  if (p.projectStatus === 'COMPLETED_SUBSIDY_CREDITED') return false
  if (!SUBSIDY_CLOCK_SET.has(p.projectStatus)) return false
  return !p.subsidyCreditedDate
}

export function subsidyClockStep(p: DeliveryControlProjectInput): SubsidyClockStep {
  if (p.subsidyRequestDate) return 'awaiting_credit'
  if (!p.feasibilityDate) return 'kseb_feasibility'
  if (!p.registrationDate) return 'kseb_registration'
  if (!p.installationCompletionDate) return 'install'
  if (!p.mnrePortalRegistrationDate) return 'mnre_portal'
  if (!p.completionReportSubmissionDate) return 'completion_report'
  return 'request'
}

function subsidyClockExceptions(p: DeliveryControlProjectInput): string[] {
  const flags: string[] = []
  const chain = [
    ymdOfField(p.confirmationDate),
    ymdOfField(p.feasibilityDate),
    ymdOfField(p.registrationDate),
    ymdOfField(p.installationCompletionDate),
    ymdOfField(p.completionReportSubmissionDate),
    ymdOfField(p.subsidyRequestDate),
    ymdOfField(p.subsidyCreditedDate),
  ].filter((d): d is string => Boolean(d))
  for (let i = 1; i < chain.length; i += 1) {
    if (chain[i] < chain[i - 1]) {
      flags.push('reversed_dates')
      break
    }
  }
  if (p.projectStatus === 'COMPLETED' && !p.subsidyRequestDate) flags.push('completed_not_requested')
  if (p.projectStatus === 'SUBMITTED_FOR_SUBSIDY' && !p.subsidyRequestDate) {
    flags.push('submitted_not_requested')
  }
  const ahead =
    p.projectStatus === 'SUBMITTED_FOR_SUBSIDY' || p.projectStatus === 'COMPLETED'
  if (
    ahead &&
    (!p.feasibilityDate ||
      !p.registrationDate ||
      !p.installationCompletionDate ||
      !p.completionReportSubmissionDate)
  ) {
    flags.push('status_ahead')
  }
  return flags
}

function subsidyStepAnchor(p: DeliveryControlProjectInput, step: SubsidyClockStep): string | null {
  switch (step) {
    case 'kseb_feasibility':
      return ymdOfField(p.confirmationDate)
    case 'kseb_registration':
      return ymdOfField(p.feasibilityDate) ?? ymdOfField(p.confirmationDate)
    case 'install':
      return ymdOfField(p.registrationDate) ?? ymdOfField(p.confirmationDate)
    case 'mnre_portal':
      return (
        ymdOfField(p.installationCompletionDate) ??
        ymdOfField(p.stageEnteredAt) ??
        ymdOfField(p.confirmationDate)
      )
    case 'completion_report':
      return ymdOfField(p.installationCompletionDate) ?? ymdOfField(p.confirmationDate)
    case 'request':
      return (
        ymdOfField(p.completionReportSubmissionDate) ??
        ymdOfField(p.installationCompletionDate) ??
        ymdOfField(p.confirmationDate)
      )
    case 'awaiting_credit':
      return ymdOfField(p.subsidyRequestDate)
    default:
      return ymdOfField(p.confirmationDate)
  }
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function buildSubsidyClock(
  projects: DeliveryControlProjectInput[],
  todayYmd: string,
): DeliveryControlPayload['subsidyClock'] {
  const jobs: SubsidyClockJob[] = []
  for (const p of projects) {
    if (!isOnSubsidyClock(p)) continue
    const step = subsidyClockStep(p)
    const anchor = subsidyStepAnchor(p, step)
    const rawDays = anchor ? daysBetweenYmd(anchor, todayYmd) : null
    const daysInStep = rawDays == null ? null : Math.max(0, rawDays)
    const exceptions = subsidyClockExceptions(p)
    jobs.push({
      id: p.id,
      slNo: p.slNo,
      customerName: p.customerName?.trim() || (p.slNo != null ? `#${p.slNo}` : 'Untitled'),
      salespersonName: p.salespersonName,
      opsPersonName: p.opsPersonName,
      assignedOpsId: p.assignedOpsId,
      stage: SALES_REVIEW_STATUS_LABELS[p.projectStatus] || p.projectStatus,
      stageStatus: p.projectStatus,
      step,
      stepLabel: SUBSIDY_CLOCK_STEP_LABELS[step],
      daysInStep,
      orderValue: roundMoney(num(p.projectCost)),
      capacityKw: p.systemCapacity,
      requestDate: ymdOfField(p.subsidyRequestDate),
      exceptions,
      exceptionLabels: exceptions.map((id) => SUBSIDY_CLOCK_EXCEPTION_LABELS[id] || id),
    })
  }

  jobs.sort((a, b) => {
    const aDays = a.daysInStep ?? -1
    const bDays = b.daysInStep ?? -1
    if (aDays !== bDays) return bDays - aDays
    return b.orderValue - a.orderValue
  })

  const stepAcc = SUBSIDY_CLOCK_STEPS.map(() => ({ jobs: 0, kw: 0, value: 0, days: [] as number[] }))
  for (const job of jobs) {
    const idx = SUBSIDY_CLOCK_STEPS.indexOf(job.step)
    if (idx < 0) continue
    stepAcc[idx].jobs += 1
    stepAcc[idx].kw += num(job.capacityKw)
    stepAcc[idx].value += job.orderValue
    if (job.daysInStep != null) stepAcc[idx].days.push(job.daysInStep)
  }

  const awaiting = jobs.filter((j) => j.step === 'awaiting_credit')
  return {
    columns: SUBSIDY_CLOCK_STEPS.map((key) => ({ key, label: SUBSIDY_CLOCK_STEP_LABELS[key] })),
    rows: [
      {
        key: 'jobs',
        label: 'Jobs',
        values: stepAcc.map((s) => s.jobs),
        total: jobs.length,
      },
      {
        key: 'capacityKw',
        label: 'Capacity (kW)',
        values: stepAcc.map((s) => s.kw),
        total: jobs.reduce((sum, j) => sum + num(j.capacityKw), 0),
      },
      {
        key: 'value',
        label: 'Order value',
        values: stepAcc.map((s) => roundMoney(s.value)),
        total: roundMoney(jobs.reduce((sum, j) => sum + j.orderValue, 0)),
      },
      {
        key: 'medianDays',
        label: 'Median days',
        values: stepAcc.map((s) => median(s.days)),
        total: median(jobs.map((j) => j.daysInStep).filter((d): d is number => d != null)),
      },
    ],
    jobs,
    kpis: {
      onClockJobs: jobs.length,
      onClockValue: roundMoney(jobs.reduce((sum, j) => sum + j.orderValue, 0)),
      onClockKw: jobs.reduce((sum, j) => sum + num(j.capacityKw), 0),
      awaitingCreditJobs: awaiting.length,
      awaitingCreditValue: roundMoney(awaiting.reduce((sum, j) => sum + j.orderValue, 0)),
      completedNotCreditedJobs: jobs.filter((j) => j.stageStatus === 'COMPLETED').length,
      stale90Jobs: jobs.filter((j) => (j.daysInStep ?? 0) >= 90).length,
      exceptionJobs: jobs.filter((j) => j.exceptions.length > 0).length,
    },
  }
}

function bucketForYmd(
  ymd: string | null,
  cols: ForecastQuarterCol[],
): DeliveryJob['forecastBucket'] {
  if (!ymd) return 'unscheduled'
  if (ymd < cols[0].startYmd) return 'CQ'
  for (const col of cols) {
    if (ymd >= col.startYmd && ymd <= col.endYmd) return col.key
  }
  return 'later'
}

type QAcc = { jobs: number; kw: number; value: number; overdue: number }

function emptyQ(): QAcc {
  return { jobs: 0, kw: 0, value: 0, overdue: 0 }
}

function addQ(acc: QAcc, job: DeliveryJob) {
  acc.jobs += 1
  acc.kw += num(job.capacityKw)
  acc.value += job.orderValue
  if (job.pastDue) acc.overdue += 1
}

export function buildDeliveryControl(
  projects: DeliveryControlProjectInput[],
  now: Date = new Date(),
): DeliveryControlPayload {
  const todayYmd = calendarYmdInTimeZone(now)
  const currentFy = calculateFYInIst(now) || '2026-27'
  const qCols = forecastQuarterColumns(now)

  const jobs: DeliveryJob[] = []
  for (const p of projects) {
    if (!DELIVERY_SET.has(p.projectStatus)) continue
    const commissionDate = ymdOfField(p.expectedCommissioningDate)
    const bucket = bucketForYmd(commissionDate, qCols)
    const pastDue = Boolean(commissionDate && commissionDate < todayYmd)
    const blockers = jobBlockers(p, todayYmd)
    const stageAnchor = ymdOfField(p.stageEnteredAt) ?? ymdOfField(p.confirmationDate)
    jobs.push({
      id: p.id,
      slNo: p.slNo,
      customerName: p.customerName?.trim() || (p.slNo != null ? `#${p.slNo}` : 'Untitled'),
      salespersonName: p.salespersonName,
      opsPersonName: p.opsPersonName,
      assignedOpsId: p.assignedOpsId,
      stage: SALES_REVIEW_STATUS_LABELS[p.projectStatus] || p.projectStatus,
      stageStatus: p.projectStatus,
      customerType: p.customerType,
      customerTypeLabel: SALES_REVIEW_CUSTOMER_TYPE_LABELS[p.customerType || ''] || p.customerType || '—',
      systemType: p.systemType,
      systemTypeLabel: SALES_REVIEW_SYSTEM_TYPE_LABELS[p.systemType || ''] || p.systemType || '—',
      segment: p.type,
      segmentLabel: SALES_REVIEW_SEGMENT_LABELS[p.type || ''] || p.type || '—',
      commissionDate,
      quarter: commissionDate
        ? `Q${indianFyQuarterFromMonth(Number(commissionDate.slice(5, 7)))}`
        : null,
      fy: commissionDate ? calculateFYInIst(`${commissionDate}T00:00:00+05:30`) : p.year || null,
      orderValue: roundMoney(num(p.projectCost)),
      capacityKw: p.systemCapacity,
      daysLate: commissionDate ? daysBetweenYmd(commissionDate, todayYmd) : null,
      daysInStage: stageAnchor ? daysBetweenYmd(stageAnchor, todayYmd) : null,
      pastDue,
      unscheduled: bucket === 'unscheduled',
      unassignedOps: !p.assignedOpsId,
      forecastBucket: bucket,
      blockers,
      blockerLabels: blockers.map((id) => DELIVERY_BLOCKER_LABELS[id] || id),
    })
  }

  jobs.sort((a, b) => {
    if (a.pastDue !== b.pastDue) return a.pastDue ? -1 : 1
    if (a.unscheduled !== b.unscheduled) return a.unscheduled ? 1 : -1
    if (a.commissionDate && b.commissionDate && a.commissionDate !== b.commissionDate) {
      return a.commissionDate < b.commissionDate ? -1 : 1
    }
    return b.orderValue - a.orderValue
  })

  const qAcc: Record<ForecastQuarterCol['key'], QAcc> = {
    CQ: emptyQ(),
    NQ: emptyQ(),
    NQ1: emptyQ(),
    NQ2: emptyQ(),
  }
  let unscheduledJobs = 0
  let unscheduledValue = 0
  let unscheduledKw = 0
  let laterJobs = 0
  let laterValue = 0
  let laterKw = 0

  for (const job of jobs) {
    if (job.forecastBucket === 'unscheduled') {
      unscheduledJobs += 1
      unscheduledValue += job.orderValue
      unscheduledKw += num(job.capacityKw)
    } else if (job.forecastBucket === 'later') {
      laterJobs += 1
      laterValue += job.orderValue
      laterKw += num(job.capacityKw)
    } else {
      addQ(qAcc[job.forecastBucket], job)
    }
  }

  const keys: ForecastQuarterCol['key'][] = ['CQ', 'NQ', 'NQ1', 'NQ2']
  const boardRows: DeliveryBoardRow[] = [
    {
      key: 'jobs',
      label: 'Jobs',
      values: keys.map((k) => qAcc[k].jobs),
      total: keys.reduce((s, k) => s + qAcc[k].jobs, 0),
    },
    {
      key: 'capacityKw',
      label: 'Capacity (kW)',
      values: keys.map((k) => qAcc[k].kw),
      total: keys.reduce((s, k) => s + qAcc[k].kw, 0),
    },
    {
      key: 'value',
      label: 'Order value',
      values: keys.map((k) => roundMoney(qAcc[k].value)),
      total: roundMoney(keys.reduce((s, k) => s + qAcc[k].value, 0)),
    },
    {
      key: 'overdue',
      label: 'Overdue',
      values: keys.map((k) => qAcc[k].overdue),
      total: keys.reduce((s, k) => s + qAcc[k].overdue, 0),
    },
  ]

  const loadMap = new Map<string, DeliveryOpsLoadRow>()
  const unassignedKey = '__unassigned__'
  for (const job of jobs) {
    const key = job.assignedOpsId || unassignedKey
    let row = loadMap.get(key)
    if (!row) {
      row = {
        opsPersonId: job.assignedOpsId,
        opsPersonName: job.assignedOpsId ? job.opsPersonName?.trim() || 'Ops' : 'Unassigned',
        jobs: 0,
        capacityKw: 0,
        orderValue: 0,
        overdue: 0,
        blocked: 0,
      }
      loadMap.set(key, row)
    }
    row.jobs += 1
    row.capacityKw += num(job.capacityKw)
    row.orderValue += job.orderValue
    if (job.pastDue) row.overdue += 1
    if (job.blockers.some((b) => PROCESS_BLOCKERS.has(b))) row.blocked += 1
  }

  const opsLoad = Array.from(loadMap.values()).sort((a, b) => {
    const aUnassigned = a.opsPersonId ? 0 : 1
    const bUnassigned = b.opsPersonId ? 0 : 1
    if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned
    return b.jobs - a.jobs || a.opsPersonName.localeCompare(b.opsPersonName)
  })

  return {
    generatedAt: now.toISOString(),
    opsPersonId: null,
    currentFy,
    board: {
      columns: qCols,
      rows: boardRows,
      unscheduledJobs,
      unscheduledValue: roundMoney(unscheduledValue),
      unscheduledKw,
      laterJobs,
      laterValue: roundMoney(laterValue),
      laterKw,
    },
    opsLoad,
    jobs,
    subsidyClock: buildSubsidyClock(projects, todayYmd),
    kpis: {
      inDeliveryJobs: jobs.length,
      inDeliveryValue: roundMoney(jobs.reduce((s, j) => s + j.orderValue, 0)),
      inDeliveryKw: jobs.reduce((s, j) => s + num(j.capacityKw), 0),
      confirmedJobs: jobs.filter((j) => j.stageStatus === 'CONFIRMED').length,
      installingJobs: jobs.filter((j) => j.stageStatus === 'UNDER_INSTALLATION').length,
      subsidyJobs: jobs.filter((j) => j.stageStatus === 'SUBMITTED_FOR_SUBSIDY').length,
      overdueJobs: jobs.filter((j) => j.pastDue).length,
      unscheduledJobs: jobs.filter((j) => j.unscheduled).length,
      unassignedJobs: jobs.filter((j) => j.unassignedOps).length,
      blockedJobs: jobs.filter((j) => j.blockers.some((b) => PROCESS_BLOCKERS.has(b))).length,
    },
  }
}
