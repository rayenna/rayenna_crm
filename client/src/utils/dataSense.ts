/**
 * Data Sense — cross-field “Needs review” flags.
 * KEEP IN SYNC with src/utils/dataSense.ts (evaluate rules).
 * Calendar comparisons use Asia/Kolkata (business timezone).
 */

export const DATA_SENSE_TIMEZONE = 'Asia/Kolkata'

export const DATA_SENSE_TERMINAL_STATUSES = [
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
  'LOST',
] as const

export const DATA_SENSE_CONFIRMED_PLUS_STATUSES = [
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'SUBMITTED_FOR_SUBSIDY',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
] as const

export const DATA_SENSE_EARLY_PIPELINE_STATUSES = ['LEAD', 'SITE_SURVEY', 'PROPOSAL'] as const

/** Deal Health expected days — A6 fires when days in stage exceed these. */
export const DATA_SENSE_STAGE_SLA_DAYS: Record<string, number> = {
  LEAD: 7,
  SITE_SURVEY: 14,
  PROPOSAL: 21,
  CONFIRMED: 30,
  UNDER_INSTALLATION: 60,
  SUBMITTED_FOR_SUBSIDY: 21,
}

/** B2: still no advance this many calendar days after confirmation. */
export const DATA_SENSE_NO_ADVANCE_GRACE_DAYS = 14

export const DATA_SENSE_RULE_IDS = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'C2',
] as const

export type DataSenseRuleId = (typeof DATA_SENSE_RULE_IDS)[number]

export type DataSenseFinding = {
  id: DataSenseRuleId
  title: string
  detail: string
  severity: 'critical' | 'warning'
}

export type DataSenseInput = {
  projectStatus: string
  expectedCommissioningDate?: string | Date | null
  confirmationDate?: string | Date | null
  lostDate?: string | Date | null
  lostReason?: string | null
  projectCost?: number | null
  advanceReceived?: number | null
  paymentStatus?: string | null
  stageEnteredAt?: string | Date | null
  systemCapacity?: number | null
  balanceAmount?: number | null
}

export function calendarYmdInTimeZone(date: Date, timeZone: string = DATA_SENSE_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Midnight today in IST, as a UTC Date (for Prisma `lt` on date-times stored in UTC). */
export function startOfTodayInIst(now: Date = new Date()): Date {
  const ymd = calendarYmdInTimeZone(now)
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000)
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function isPastCalendarDate(v: string | Date | null | undefined, now: Date): boolean {
  const d = toDate(v)
  if (!d) return false
  return calendarYmdInTimeZone(d) < calendarYmdInTimeZone(now)
}

/** Whole calendar days from `from` to `to` in IST (can be negative). */
export function calendarDaysBetweenIst(
  from: string | Date | null | undefined,
  to: Date,
): number | null {
  const d = toDate(from)
  if (!d) return null
  const a = calendarYmdInTimeZone(d)
  const b = calendarYmdInTimeZone(to)
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const utcA = Date.UTC(ay, am - 1, ad)
  const utcB = Date.UTC(by, bm - 1, bd)
  return Math.floor((utcB - utcA) / (24 * 60 * 60 * 1000))
}

function isBlank(v: string | null | undefined): boolean {
  return v == null || String(v).trim() === ''
}

function isConfirmedPlus(status: string): boolean {
  return (DATA_SENSE_CONFIRMED_PLUS_STATUSES as readonly string[]).includes(status)
}

function isTerminal(status: string): boolean {
  return (DATA_SENSE_TERMINAL_STATUSES as readonly string[]).includes(status)
}

function isEarlyPipeline(status: string): boolean {
  return (DATA_SENSE_EARLY_PIPELINE_STATUSES as readonly string[]).includes(status)
}

function money(v: number | null | undefined): number | null {
  if (v == null || v === ('' as unknown)) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function capacityInvalid(v: number | null | undefined): boolean {
  const n = money(v)
  return n == null || n <= 0
}

export function evaluateDataSense(project: DataSenseInput, now: Date = new Date()): DataSenseFinding[] {
  const findings: DataSenseFinding[] = []
  const status = project.projectStatus

  if (!isTerminal(status) && isPastCalendarDate(project.expectedCommissioningDate, now)) {
    findings.push({
      id: 'A1',
      severity: 'critical',
      title: 'Expected commissioning date has passed',
      detail:
        'This deal is still open. Update the expected commissioning date, or move status to Completed, Subsidy Credited, or Lost.',
    })
  }

  if (isConfirmedPlus(status) && !toDate(project.confirmationDate)) {
    findings.push({
      id: 'A2',
      severity: 'warning',
      title: 'Confirmation date missing',
      detail:
        'Confirmed and later stages should have a confirmation date so collections and reporting stay accurate.',
    })
  }

  if (status === 'LOST') {
    const missingDate = !toDate(project.lostDate)
    const missingReason = isBlank(project.lostReason ?? undefined)
    if (missingDate || missingReason) {
      const bits: string[] = []
      if (missingDate) bits.push('lost date')
      if (missingReason) bits.push('reason for loss')
      findings.push({
        id: 'A3',
        severity: 'warning',
        title: 'Lost record incomplete',
        detail: `This Lost project is missing ${bits.join(' and ')}.`,
      })
    }
  }

  const confirm = toDate(project.confirmationDate)
  const commission = toDate(project.expectedCommissioningDate)
  if (confirm && commission && calendarYmdInTimeZone(commission) < calendarYmdInTimeZone(confirm)) {
    findings.push({
      id: 'A4',
      severity: 'critical',
      title: 'Commissioning date before confirmation',
      detail:
        'Expected commissioning is earlier than the confirmation date. Fix the dates so the timeline is possible.',
    })
  }

  if (isEarlyPipeline(status) && confirm) {
    findings.push({
      id: 'A5',
      severity: 'warning',
      title: 'Confirmation date on an early-stage deal',
      detail:
        'A confirmation date is set while status is still Lead, Site Survey, or Proposal. Move the stage or clear the date.',
    })
  }

  const slaDays = DATA_SENSE_STAGE_SLA_DAYS[status]
  const daysInStage = calendarDaysBetweenIst(project.stageEnteredAt, now)
  if (slaDays != null && daysInStage != null && daysInStage > slaDays) {
    findings.push({
      id: 'A6',
      severity: 'warning',
      title: 'Longer in this stage than expected',
      detail: `This deal has been in the current stage for ${daysInStage} days (expected ${slaDays}). Move the stage or log why it is stuck.`,
    })
  }

  const cost = money(project.projectCost) ?? 0
  const advance = money(project.advanceReceived)
  const advanceZero = advance == null || advance <= 0
  if (isConfirmedPlus(status) && cost > 0 && advanceZero && project.paymentStatus === 'PENDING') {
    findings.push({
      id: 'B1',
      severity: 'warning',
      title: 'No advance recorded',
      detail:
        'This confirmed deal has an order value but payment status is still Pending and advance received is ₹0.',
    })
  }

  const daysSinceConfirm = calendarDaysBetweenIst(project.confirmationDate, now)
  if (
    isConfirmedPlus(status) &&
    cost > 0 &&
    advanceZero &&
    project.paymentStatus === 'PENDING' &&
    daysSinceConfirm != null &&
    daysSinceConfirm > DATA_SENSE_NO_ADVANCE_GRACE_DAYS
  ) {
    findings.push({
      id: 'B2',
      severity: 'warning',
      title: 'No advance after confirmation window',
      detail: `Payment is still Pending with ₹0 advance more than ${DATA_SENSE_NO_ADVANCE_GRACE_DAYS} days after confirmation.`,
    })
  }

  const costNum = money(project.projectCost)
  const advNum = money(project.advanceReceived)
  if (costNum != null && advNum != null && advNum > costNum) {
    findings.push({
      id: 'B3',
      severity: 'critical',
      title: 'Advance exceeds order value',
      detail: 'Advance received is greater than project cost. Check the amounts.',
    })
  }

  const balance = money(project.balanceAmount)
  if (
    (status === 'COMPLETED' || status === 'COMPLETED_SUBSIDY_CREDITED') &&
    project.paymentStatus === 'PENDING' &&
    balance != null &&
    balance > 0
  ) {
    findings.push({
      id: 'B4',
      severity: 'warning',
      title: 'Completed with payment still pending',
      detail: 'This project is Completed (or Subsidy Credited) but payment is Pending with a remaining balance.',
    })
  }

  if (project.paymentStatus === 'FULLY_PAID' && balance != null && balance > 0) {
    findings.push({
      id: 'B5',
      severity: 'critical',
      title: 'Marked fully paid with a balance',
      detail: 'Payment status is Fully Paid but outstanding balance is greater than ₹0. Reconcile payments.',
    })
  }

  if (isConfirmedPlus(status) && capacityInvalid(project.systemCapacity)) {
    findings.push({
      id: 'C2',
      severity: 'warning',
      title: 'System capacity missing',
      detail: 'Confirmed and later stages should have a valid system capacity (kW) for reporting and proposals.',
    })
  }

  return findings
}

export function projectNeedsDataSenseReview(project: DataSenseInput, now: Date = new Date()): boolean {
  return evaluateDataSense(project, now).length > 0
}

/** Soft-block on save (P3): user must confirm. Not a hard reject. */
export const DATA_SENSE_SOFT_BLOCK_RULE_IDS: DataSenseRuleId[] = ['A4', 'B3']

export const DATA_SENSE_IMPOSSIBLE_CODE = 'DATA_SENSE_IMPOSSIBLE'

export function dataSenseImpossibleFindings(
  project: DataSenseInput,
  now: Date = new Date(),
): DataSenseFinding[] {
  return evaluateDataSense(project, now).filter((f) =>
    (DATA_SENSE_SOFT_BLOCK_RULE_IDS as readonly string[]).includes(f.id),
  )
}

export function dataSenseAckFromBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const v = (body as Record<string, unknown>).acknowledgeDataSenseImpossibilities
  return v === true || v === 'true' || v === 1 || v === '1'
}

export function dataSenseConfirmMessage(findings: DataSenseFinding[]): string {
  const lines = findings.map((f) => `• ${f.title} — ${f.detail}`)
  return (
    'These values look impossible. Fix them on this form, or save anyway if you are sure.\n\n' +
    lines.join('\n')
  )
}

export function isDataSenseImpossibleResponse(data: unknown): data is {
  code: typeof DATA_SENSE_IMPOSSIBLE_CODE
  findings: DataSenseFinding[]
  error?: string
} {
  if (!data || typeof data !== 'object') return false
  const rec = data as { code?: unknown; findings?: unknown }
  return rec.code === DATA_SENSE_IMPOSSIBLE_CODE && Array.isArray(rec.findings)
}

/** My Day: impossibilities + original P0 action items + aged no-advance (not SLA / Lost / capacity). */
export const DATA_SENSE_MY_DAY_RULE_IDS: DataSenseRuleId[] = ['A1', 'A2', 'A4', 'B1', 'B2', 'B3', 'B5']

/** Zenith Things needing attention — explorer can evaluate these (not A3; Lost fields missing). */
export const DATA_SENSE_ZENITH_RULE_IDS: DataSenseRuleId[] = [
  'A1',
  'A2',
  'A4',
  'A5',
  'A6',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'C2',
]

export const DATA_SENSE_RULE_SHORT_LABEL: Record<DataSenseRuleId, string> = {
  A1: 'Overdue commissioning',
  A2: 'Missing confirmation',
  A3: 'Incomplete Lost',
  A4: 'Dates reversed',
  A5: 'Confirm date too early',
  A6: 'Stuck in stage',
  B1: 'No advance',
  B2: 'Advance overdue',
  B3: 'Advance > order',
  B4: 'Done, still pending',
  B5: 'Paid but balance',
  C2: 'No system size',
}

export function parseDataSenseRule(raw: unknown): DataSenseRuleId | null {
  const v = typeof raw === 'string' ? raw.trim() : ''
  return (DATA_SENSE_RULE_IDS as readonly string[]).includes(v) ? (v as DataSenseRuleId) : null
}

export function emptyDataSenseRuleCounts(): Record<DataSenseRuleId, number> {
  const counts = {} as Record<DataSenseRuleId, number>
  for (const id of DATA_SENSE_RULE_IDS) counts[id] = 0
  return counts
}

export function dataSenseMyDayTaskContent(ruleId: DataSenseRuleId, customerName: string): string {
  const name = customerName.trim() || 'this project'
  switch (ruleId) {
    case 'A1':
      return `Update expected commissioning or stage — ${name}`
    case 'A2':
      return `Add confirmation date — ${name}`
    case 'A4':
      return `Fix commissioning vs confirmation dates — ${name}`
    case 'A5':
      return `Align stage with confirmation date — ${name}`
    case 'A6':
      return `Move stage or log blocker — ${name}`
    case 'B1':
    case 'B2':
      return `Record advance payment — ${name}`
    case 'B3':
      return `Check advance vs order value — ${name}`
    case 'B4':
      return `Update payment status after completion — ${name}`
    case 'B5':
      return `Reconcile fully paid vs balance — ${name}`
    case 'C2':
      return `Add system capacity (kW) — ${name}`
    default:
      return `Needs review — ${name}`
  }
}

export type DataSenseExplorerHit = {
  projectId: string
  projectSerialNumber: number | null
  customerName: string
  stageLabel: string
  salespersonId: string | null
  salespersonName: string
  findings: DataSenseFinding[]
  primary: DataSenseFinding
}

export type DataSenseSalespersonRollup = {
  salespersonId: string | null
  salespersonName: string
  projectCount: number
}

type ExplorerLike = {
  id: string
  project_serial_number?: number | null
  projectStatus: string
  stageLabel?: string
  customer_name?: string
  expected_close_date?: string | null
  confirmation_date?: string | null
  deal_value?: number | null
  advance_received?: number | null
  payment_status?: string | null
  stage_entered_at?: string | null
  system_capacity_kw?: number | null
  balance_amount?: number | null
  assigned_to_id?: string | null
  assigned_to_name?: string
}

export function dataSenseInputFromExplorer(p: ExplorerLike): DataSenseInput {
  return {
    projectStatus: p.projectStatus,
    expectedCommissioningDate: p.expected_close_date,
    confirmationDate: p.confirmation_date,
    projectCost: p.deal_value,
    advanceReceived: p.advance_received,
    paymentStatus: p.payment_status,
    stageEnteredAt: p.stage_entered_at,
    systemCapacity: p.system_capacity_kw,
    balanceAmount: p.balance_amount,
  }
}

/**
 * Data Sense hits for Zenith explorer / Things needing attention.
 * Omits A3 (incomplete Lost): explorer rows do not carry lostDate/lostReason.
 */
export function dataSenseHitsOnExplorerProjects(
  projects: ExplorerLike[] | null | undefined,
  now: Date = new Date(),
): DataSenseExplorerHit[] {
  const list = Array.isArray(projects) ? projects : []
  const hits: DataSenseExplorerHit[] = []
  for (const p of list) {
    const findings = evaluateDataSense(dataSenseInputFromExplorer(p), now).filter((f) =>
      (DATA_SENSE_ZENITH_RULE_IDS as readonly string[]).includes(f.id),
    )
    if (!findings.length) continue
    const primary = findings.find((f) => f.severity === 'critical') ?? findings[0]!
    hits.push({
      projectId: p.id,
      projectSerialNumber: p.project_serial_number ?? null,
      customerName: (p.customer_name ?? '').trim() || 'Unknown',
      stageLabel: p.stageLabel || p.projectStatus.replace(/_/g, ' '),
      salespersonId: p.assigned_to_id ?? null,
      salespersonName: (p.assigned_to_name ?? '').trim() || 'Unassigned',
      findings,
      primary,
    })
  }
  hits.sort((a, b) => {
    const sev = (s: DataSenseFinding['severity']) => (s === 'critical' ? 0 : 1)
    const d = sev(a.primary.severity) - sev(b.primary.severity)
    if (d !== 0) return d
    return a.primary.id.localeCompare(b.primary.id)
  })
  return hits
}

export function countDataSenseHitsByRule(hits: DataSenseExplorerHit[]): Record<DataSenseRuleId, number> {
  const counts = emptyDataSenseRuleCounts()
  for (const h of hits) {
    for (const f of h.findings) counts[f.id] += 1
  }
  return counts
}

export function dataSenseRollupBySalesperson(hits: DataSenseExplorerHit[]): DataSenseSalespersonRollup[] {
  const map = new Map<string, DataSenseSalespersonRollup>()
  for (const h of hits) {
    const key = h.salespersonId ?? '__unassigned__'
    const existing = map.get(key)
    if (existing) {
      existing.projectCount += 1
    } else {
      map.set(key, {
        salespersonId: h.salespersonId,
        salespersonName: h.salespersonName,
        projectCount: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.projectCount - a.projectCount || a.salespersonName.localeCompare(b.salespersonName))
}
