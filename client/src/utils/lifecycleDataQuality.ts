import {
  ProjectStatus,
  UserRole,
  type Project,
  type User,
} from '../types'
import { canEditCustomer } from './customerPermissions'
import { canEditProject } from './projectPermissions'

export type LifecycleDataQualitySeverity = 'warning' | 'info'

export type PeSummaryStatus = 'none' | 'draft' | 'proposal-ready'

export type LifecycleFindingFixKind =
  | 'lifecycle' // panel W, brands — Project Lifecycle (Admin / Ops)
  | 'capacity' // systemCapacity — sales commercial section
  | 'gps' // customer map
  | 'documents' // Key Artifacts uploads
  | 'pe' // PE artifacts — open Proposals (no edit form)

export type LifecycleDataQualityFinding = {
  id: string
  severity: LifecycleDataQualitySeverity
  title: string
  detail: string
  href?: string
  /** When true, opening Proposal Engine should soft-confirm first. */
  peSoftGate: boolean
  /** Which permission gates the Fix link / actionable copy. */
  fixKind: LifecycleFindingFixKind
}

export type PeSummaryInput = {
  peStatus: PeSummaryStatus
} | null | undefined

const STATUS_ORDER: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
]

const BRAND_REMINDER_STATUSES = new Set<ProjectStatus>([
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
])

function statusAtOrAfter(current: ProjectStatus, min: ProjectStatus): boolean {
  const a = STATUS_ORDER.indexOf(current)
  const b = STATUS_ORDER.indexOf(min)
  if (a < 0 || b < 0) return false
  return a >= b
}

function brandEntered(v: string | null | undefined): boolean {
  return Boolean((v ?? '').trim())
}

function hasValidGps(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): boolean {
  const la = typeof lat === 'string' ? Number(lat) : lat
  const lo = typeof lng === 'string' ? Number(lng) : lng
  return (
    typeof la === 'number' &&
    Number.isFinite(la) &&
    typeof lo === 'number' &&
    Number.isFinite(lo)
  )
}

function hasValidSystemCapacity(kw: number | string | null | undefined): boolean {
  const n = typeof kw === 'string' ? Number(kw) : kw
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && Number.isInteger(n)
}

function hasValidPanelWattage(w: number | string | null | undefined): boolean {
  const n = typeof w === 'string' ? Number(w) : w
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

/** Project Lifecycle section: Admin always; Ops when they may edit the project. */
export function canFixLifecycleFields(
  project: Pick<Project, 'projectStatus' | 'salespersonId'> | null | undefined,
  user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
  if (!user || !project) return false
  if (user.role === UserRole.ADMIN) return canEditProject(project, user)
  if (user.role === UserRole.OPERATIONS) return canEditProject(project, user)
  return false
}

/** System capacity lives in the sales/commercial block (not Lifecycle). */
export function canFixSystemCapacity(
  project: Pick<Project, 'projectStatus' | 'salespersonId'> | null | undefined,
  user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
  if (!user || !project) return false
  if (user.role === UserRole.ADMIN) return canEditProject(project, user)
  if (user.role === UserRole.SALES) return canEditProject(project, user)
  if (user.role === UserRole.OPERATIONS) return canEditProject(project, user)
  return false
}

export function canFixProjectDocuments(
  project: Pick<Project, 'projectStatus' | 'salespersonId'> | null | undefined,
  user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
  if (!user || !project) return false
  if (
    user.role !== UserRole.ADMIN &&
    user.role !== UserRole.SALES &&
    user.role !== UserRole.OPERATIONS
  ) {
    return false
  }
  return canEditProject(project, user)
}

/** Finance has payments-only edit; data-quality banner is not for them. */
export function shouldShowLifecycleDataQualityBanner(
  user: Pick<User, 'role'> | null | undefined,
): boolean {
  if (!user) return false
  return user.role !== UserRole.FINANCE
}

/**
 * Deterministic lifecycle data-quality checklist for Project Detail.
 * No LLM — advisory findings only; callers decide soft-gates and role presentation.
 */
export function evaluateLifecycleDataQuality(
  project: Pick<
    Project,
    | 'id'
    | 'customerId'
    | 'projectStatus'
    | 'systemCapacity'
    | 'panelCapacityW'
    | 'panelBrand'
    | 'inverterBrand'
    | 'documents'
    | 'customer'
  >,
  peSummary?: PeSummaryInput,
): LifecycleDataQualityFinding[] {
  const status = project.projectStatus
  if (status === ProjectStatus.LOST) return []

  const findings: LifecycleDataQualityFinding[] = []
  const editHref = `/projects/${project.id}/edit`
  const customerHref = project.customerId
    ? `/customers/${project.customerId}`
    : undefined
  const peOpenStatus =
    status === ProjectStatus.PROPOSAL || status === ProjectStatus.CONFIRMED

  // GPS — SITE_SURVEY+
  if (statusAtOrAfter(status, ProjectStatus.SITE_SURVEY)) {
    const lat = project.customer?.latitude
    const lng = project.customer?.longitude
    if (!hasValidGps(lat, lng)) {
      findings.push({
        id: 'missing_gps',
        severity: 'warning',
        title: 'Customer map location missing',
        detail:
          'Add GPS on the customer record so roof layout and site visits use the correct pin.',
        href: customerHref ? `${customerHref}?edit=1` : undefined,
        peSoftGate: peOpenStatus,
        fixKind: 'gps',
      })
    }
  }

  // System capacity — PROPOSAL+
  if (statusAtOrAfter(status, ProjectStatus.PROPOSAL)) {
    if (!hasValidSystemCapacity(project.systemCapacity ?? null)) {
      findings.push({
        id: 'missing_system_capacity',
        severity: 'warning',
        title: 'System capacity missing',
        detail: 'Set Project System Capacity to a whole number of kW (1, 2, 3, …).',
        href: editHref,
        peSoftGate: peOpenStatus,
        fixKind: 'capacity',
      })
    }
  }

  // Panel wattage — PROPOSAL+
  if (statusAtOrAfter(status, ProjectStatus.PROPOSAL)) {
    if (!hasValidPanelWattage(project.panelCapacityW ?? null)) {
      findings.push({
        id: 'missing_panel_wattage',
        severity: 'warning',
        title: 'Panel wattage missing',
        detail:
          'Set CRM Project Lifecycle panel wattage (W). Proposal Engine uses this when costing names lack a wattage token.',
        href: editHref,
        peSoftGate: peOpenStatus,
        fixKind: 'lifecycle',
      })
    }
  }

  // Brands — late stages only (same as existing reminder)
  if (BRAND_REMINDER_STATUSES.has(status)) {
    const missingPanel = !brandEntered(project.panelBrand)
    const missingInverter = !brandEntered(project.inverterBrand)
    if (missingPanel || missingInverter) {
      const parts: string[] = []
      if (missingPanel) parts.push('panel brand')
      if (missingInverter) parts.push('inverter brand')
      findings.push({
        id: 'missing_brands',
        severity: 'warning',
        title: 'Lifecycle brands incomplete',
        detail: `Enter ${parts.join(' and ')} for reporting and ops handoff.`,
        href: editHref,
        peSoftGate: false,
        fixKind: 'lifecycle',
      })
    }
  }

  // PE artifacts
  const peStatus = peSummary?.peStatus
  if (status === ProjectStatus.CONFIRMED && peStatus === 'none') {
    findings.push({
      id: 'pe_none',
      severity: 'warning',
      title: 'No Proposal Engine work yet',
      detail:
        'Confirmed deals should have costing / BOM / ROI / proposal started in Proposal Engine.',
      peSoftGate: true,
      fixKind: 'pe',
    })
  } else if (status === ProjectStatus.PROPOSAL && peStatus === 'none') {
    findings.push({
      id: 'pe_none_info',
      severity: 'info',
      title: 'Proposal Engine not started',
      detail: 'Open Proposals to build costing, BOM, ROI, and the customer proposal.',
      peSoftGate: false,
      fixKind: 'pe',
    })
  }

  // Documents — CONFIRMED+ (only when documents array is present on the payload)
  if (statusAtOrAfter(status, ProjectStatus.CONFIRMED) && Array.isArray(project.documents)) {
    if (project.documents.length === 0) {
      findings.push({
        id: 'missing_documents',
        severity: 'info',
        title: 'No documents uploaded',
        detail: 'Upload agreements, bills, or sheets under Key Artifacts when available.',
        href: editHref,
        peSoftGate: false,
        fixKind: 'documents',
      })
    }
  }

  return findings
}

export function peSoftGateFindings(
  findings: LifecycleDataQualityFinding[],
): LifecycleDataQualityFinding[] {
  return findings.filter((f) => f.peSoftGate)
}

type PresentContext = {
  project: Pick<Project, 'id' | 'projectStatus' | 'salespersonId' | 'customerId' | 'customer'>
  user: Pick<User, 'id' | 'role'> | null | undefined
}

function viewerCanOpenProposals(
  user: Pick<User, 'role'> | null | undefined,
): boolean {
  if (!user) return false
  return (
    user.role === UserRole.ADMIN ||
    user.role === UserRole.SALES ||
    user.role === UserRole.OPERATIONS ||
    user.role === UserRole.MANAGEMENT ||
    user.role === UserRole.FINANCE
  )
}

function viewerCanFix(
  finding: LifecycleDataQualityFinding,
  ctx: PresentContext,
): boolean {
  const { project, user } = ctx
  switch (finding.fixKind) {
    case 'lifecycle':
      return canFixLifecycleFields(project, user)
    case 'capacity':
      return canFixSystemCapacity(project, user)
    case 'documents':
      return canFixProjectDocuments(project, user)
    case 'gps':
      return canEditCustomer(project.customer ?? { salespersonId: undefined }, user)
    case 'pe':
      // Actionable via Proposals button (no form Fix link)
      return viewerCanOpenProposals(user)
    default:
      return false
  }
}

function detailWhenCannotFix(
  finding: LifecycleDataQualityFinding,
  ctx: PresentContext,
): string {
  const role = ctx.user?.role
  switch (finding.id) {
    case 'missing_panel_wattage':
      if (role === UserRole.OPERATIONS) {
        return 'Project Lifecycle edits open for Operations after Confirmed. Ask Admin to set panel wattage (W) now, or set it once the project is Confirmed.'
      }
      return 'Ask Operations (or Admin) to set panel wattage (W) in Project Lifecycle. Proposal Engine uses this when costing names lack a wattage token.'
    case 'missing_brands':
      if (role === UserRole.OPERATIONS) {
        return 'Ask Admin to enter brands, or set them in Project Lifecycle once you can edit this project.'
      }
      return 'Ask Operations (or Admin) to enter panel and inverter brands in Project Lifecycle.'
    case 'missing_system_capacity':
      return 'Ask Sales or Admin to set Project System Capacity (whole kW) on the project.'
    case 'missing_gps':
      return 'Ask the account owner (Sales) or Admin to add GPS on the customer record.'
    case 'missing_documents':
      return 'Ask Sales or Operations to upload agreements, bills, or sheets under Key Artifacts.'
    case 'pe_none':
      return 'Use the Proposals button to start costing / BOM / ROI / proposal in Proposal Engine, or ask Sales if you do not handle PE.'
    case 'pe_none_info':
      return 'Use the Proposals button when ready to start Proposal Engine work.'
    default:
      return finding.detail
  }
}

/**
 * Tailor findings for the logged-in viewer: drop Fix links they cannot use,
 * rewrite copy to name who should fix, hide banner entirely for Finance.
 */
export function presentLifecycleDataQualityForViewer(
  findings: LifecycleDataQualityFinding[],
  ctx: PresentContext,
): LifecycleDataQualityFinding[] {
  if (!shouldShowLifecycleDataQualityBanner(ctx.user)) return []

  return findings.map((f) => {
    const canFix = viewerCanFix(f, ctx)
    if (canFix) {
      if (f.fixKind === 'pe') {
        return { ...f, href: undefined }
      }
      return f
    }
    return {
      ...f,
      href: undefined,
      detail: detailWhenCannotFix(f, ctx),
    }
  })
}
