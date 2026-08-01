import { format, parseISO } from 'date-fns'
import type { AuditLog, Document, Project, ProjectRemark } from '../types'
import { getCustomerDisplayName } from './customerRecord'
import { formatINR } from './reminderTemplates'
import type { PeSummaryStatus } from './lifecycleDataQuality'

export type HandoffAudience = 'sales_to_ops' | 'ops_to_finance' | 'full'

export type HandoffPeSummary = {
  peStatus: PeSummaryStatus
  lastUpdated?: string
} | null | undefined

export type HandoffBriefInput = {
  project: Project
  remarks?: ProjectRemark[]
  peSummary?: HandoffPeSummary
  /** Optional open data-quality titles (from lifecycle evaluator). */
  openGaps?: string[]
  generatedAt?: Date
}

const AUDIENCE_LABEL: Record<HandoffAudience, string> = {
  sales_to_ops: 'Sales → Ops',
  ops_to_finance: 'Ops → Finance',
  full: 'Full brief',
}

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  try {
    const d = parseISO(iso.includes('T') ? iso : `${iso}T00:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return format(d, 'd MMM yyyy')
  } catch {
    return '—'
  }
}

function fmtDateTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return format(d, 'd MMM yyyy HH:mm')
  } catch {
    return '—'
  }
}

function personLabel(user: { name?: string; email?: string } | null | undefined): string {
  if (!user) return '—'
  return user.name?.trim() || user.email?.trim() || '—'
}

function paymentTotals(project: Project): { received: number; order: number; balance: number } {
  const received =
    (Number(project.advanceReceived) || 0) +
    (Number(project.payment1) || 0) +
    (Number(project.payment2) || 0) +
    (Number(project.payment3) || 0) +
    (Number(project.lastPayment) || 0)
  const order = Number(project.projectCost) || 0
  const balance =
    typeof project.balanceAmount === 'number' && Number.isFinite(project.balanceAmount)
      ? Math.max(0, project.balanceAmount)
      : Math.max(0, order - received)
  return { received, order, balance }
}

function peLine(pe: HandoffPeSummary): string {
  if (!pe || pe.peStatus === 'none') return 'Proposal Engine: not started'
  if (pe.peStatus === 'proposal-ready') {
    return `Proposal Engine: ready${pe.lastUpdated ? ` (updated ${fmtDateTime(pe.lastUpdated)})` : ''}`
  }
  return `Proposal Engine: draft${pe.lastUpdated ? ` (updated ${fmtDateTime(pe.lastUpdated)})` : ''}`
}

function docLines(docs: Document[] | undefined, max = 12): string[] {
  if (!docs?.length) return ['- (none)']
  const sorted = [...docs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const lines = sorted.slice(0, max).map((d) => {
    const cat = (d.category || 'OTHER').replace(/_/g, ' ')
    return `- [${cat}] ${d.fileName} (${fmtDate(d.createdAt)})`
  })
  if (sorted.length > max) lines.push(`- …and ${sorted.length - max} more`)
  return lines
}

function remarkLines(remarks: ProjectRemark[] | undefined, max = 8): string[] {
  if (!remarks?.length) return ['- (none)']
  const sorted = [...remarks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const lines = sorted.slice(0, max).map((r) => {
    const who = personLabel(r.user)
    const text = (r.remark || '').replace(/\s+/g, ' ').trim()
    const clipped = text.length > 160 ? `${text.slice(0, 157)}…` : text
    return `- ${fmtDateTime(r.createdAt)} · ${who}: ${clipped || '(empty)'}`
  })
  if (sorted.length > max) lines.push(`- …and ${sorted.length - max} more`)
  return lines
}

function auditLines(logs: AuditLog[] | undefined, max = 10): string[] {
  if (!logs?.length) return ['- (none recent)']
  const sorted = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const lines = sorted.slice(0, max).map((log) => {
    const who = personLabel(log.user)
    const field = log.field ? ` · ${log.field}` : ''
    const change =
      log.oldValue != null || log.newValue != null
        ? ` (${log.oldValue ?? '—'} → ${log.newValue ?? '—'})`
        : ''
    return `- ${fmtDateTime(log.createdAt)} · ${who}${field}${change}`
  })
  if (sorted.length > max) lines.push(`- …and ${sorted.length - max} more`)
  return lines
}

function headerBlock(project: Project, audience: HandoffAudience, at: Date): string[] {
  const customer = project.customer ? getCustomerDisplayName(project.customer) : 'Unknown customer'
  return [
    `Rayenna CRM — Handoff brief (${AUDIENCE_LABEL[audience]})`,
    `Generated ${format(at, 'd MMM yyyy HH:mm')}`,
    '',
    `Project #${project.slNo} · ${customer}`,
    `Status: ${String(project.projectStatus).replace(/_/g, ' ')}`,
    `Segment: ${String(project.type).replace(/_/g, ' ')}`,
    `Sales: ${personLabel(project.salesperson)} · Ops: ${personLabel(project.opsPerson)}`,
  ]
}

function siteAndLifecycleBlock(project: Project): string[] {
  const lines = [
    '',
    '— Site & lifecycle —',
    `System capacity: ${project.systemCapacity != null ? `${project.systemCapacity} kW` : '—'}`,
    `Panel: ${project.panelBrand || '—'} / ${project.panelCapacityW != null ? `${project.panelCapacityW} W` : '— W'}`,
    `Inverter: ${project.inverterBrand || '—'} / ${project.inverterCapacityKw != null ? `${project.inverterCapacityKw} kW` : '— kW'}`,
    `Roof: ${project.roofType || '—'}`,
    `Site address: ${project.siteAddress?.trim() || '—'}`,
  ]
  if (project.customer?.latitude != null && project.customer?.longitude != null) {
    lines.push(`GPS: ${project.customer.latitude}, ${project.customer.longitude}`)
  } else {
    lines.push('GPS: not set')
  }
  return lines
}

function paymentBlock(project: Project): string[] {
  const { received, order, balance } = paymentTotals(project)
  const lines = [
    '',
    '— Payments —',
    `Order value: ${order > 0 ? formatINR(order) : '—'}`,
    `Received: ${formatINR(received)}`,
    `Outstanding: ${formatINR(balance)}`,
    `Payment status: ${String(project.paymentStatus || '—').replace(/_/g, ' ')}`,
    `Confirmed: ${fmtDate(project.confirmationDate)}`,
  ]
  if (project.availingLoan) {
    lines.push(
      `Loan: yes · ${project.financingBank || project.financingBankOther || 'bank TBD'}`,
    )
  } else if (project.availingLoan === false) {
    lines.push('Loan: no')
  }
  const installments: string[] = []
  if (Number(project.advanceReceived) > 0) {
    installments.push(`Advance ${formatINR(Number(project.advanceReceived))} (${fmtDate(project.advanceReceivedDate)})`)
  }
  if (Number(project.payment1) > 0) {
    installments.push(`P1 ${formatINR(Number(project.payment1))} (${fmtDate(project.payment1Date)})`)
  }
  if (Number(project.payment2) > 0) {
    installments.push(`P2 ${formatINR(Number(project.payment2))} (${fmtDate(project.payment2Date)})`)
  }
  if (Number(project.payment3) > 0) {
    installments.push(`P3 ${formatINR(Number(project.payment3))} (${fmtDate(project.payment3Date)})`)
  }
  if (Number(project.lastPayment) > 0) {
    installments.push(`Last ${formatINR(Number(project.lastPayment))} (${fmtDate(project.lastPaymentDate)})`)
  }
  if (installments.length) {
    lines.push('Installments:')
    for (const row of installments) lines.push(`- ${row}`)
  }
  return lines
}

function peAndGapsBlock(pe: HandoffPeSummary, openGaps: string[] | undefined): string[] {
  const lines = ['', '— Proposal Engine & readiness —', peLine(pe)]
  if (openGaps?.length) {
    lines.push('Open gaps:')
    for (const g of openGaps.slice(0, 8)) lines.push(`- ${g}`)
    if (openGaps.length > 8) lines.push(`- …and ${openGaps.length - 8} more`)
  } else {
    lines.push('Open gaps: none flagged')
  }
  return lines
}

/**
 * Deterministic plain-text handoff brief (no LLM).
 * Audience trims emphasis; all modes stay advisory copy/export only.
 */
export function buildHandoffBrief(input: HandoffBriefInput, audience: HandoffAudience): string {
  const { project, remarks, peSummary, openGaps } = input
  const at = input.generatedAt ?? new Date()
  const lines: string[] = [...headerBlock(project, audience, at)]

  const includeSite = audience === 'sales_to_ops' || audience === 'full'
  const includePayments = audience === 'ops_to_finance' || audience === 'full'
  const includePe = audience === 'sales_to_ops' || audience === 'full'
  // Finance still needs a one-line PE status for context
  const includePeShort = audience === 'ops_to_finance'

  if (includeSite) lines.push(...siteAndLifecycleBlock(project))
  if (includePayments) lines.push(...paymentBlock(project))
  else if (audience === 'sales_to_ops') {
    const { balance, order } = paymentTotals(project)
    lines.push(
      '',
      '— Commercial snapshot —',
      `Order / outstanding: ${order > 0 ? formatINR(order) : '—'} / ${formatINR(balance)}`,
    )
  }

  if (includePe) lines.push(...peAndGapsBlock(peSummary, openGaps))
  else if (includePeShort) {
    lines.push('', '— Proposal Engine —', peLine(peSummary))
  }

  lines.push('', '— Documents —', ...docLines(project.documents))
  lines.push('', '— Recent remarks —', ...remarkLines(remarks))
  lines.push('', '— Recent field changes —', ...auditLines(project.auditLogs))
  lines.push(
    '',
    '— Notes —',
    'This brief is generated in Rayenna for handoff. It does not change project status or send messages.',
  )

  return lines.join('\n')
}

export function handoffAudienceLabel(audience: HandoffAudience): string {
  return AUDIENCE_LABEL[audience]
}

export function buildHandoffLoggedRemark(audience: HandoffAudience): string {
  return `Handoff brief copied/shared (${AUDIENCE_LABEL[audience]}). Advisory only — no status change.`
}

export function defaultHandoffAudienceForRole(
  roles: string[] | undefined | null,
): HandoffAudience {
  const set = new Set((roles || []).map((r) => String(r).toUpperCase()))
  if (set.has('FINANCE')) return 'ops_to_finance'
  if (set.has('OPERATIONS')) return 'sales_to_ops'
  if (set.has('SALES')) return 'sales_to_ops'
  return 'full'
}
