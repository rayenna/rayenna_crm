/** Parse Zenith Ask chart deep-link query params for the Projects list. */

const SYSTEM_TYPES = new Set(['ON_GRID', 'OFF_GRID', 'HYBRID'])
const STATUS_INDICATORS = new Set(['GREEN', 'AMBER', 'RED'])
const PROJECT_STAGES = new Set([
  'SURVEY',
  'PROPOSAL',
  'APPROVED',
  'INSTALLATION',
  'BILLING',
  'LIVE',
  'AMC',
  'LOST',
])
const INSTALL_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
const PAYMENT_MODES = new Set(['UPI', 'BANK', 'CHEQUE'])

export type AskProjectsDrillParams = {
  panelType: string
  systemType: string
  roofType: string
  statusIndicator: string
  projectStage: string
  capacityMin: number | null
  capacityMax: number | null
  hubPlantLinked: boolean | null
  salespersonName: string
  opsName: string
  city: string
  installationStatus: string
  paymentMode: string
  notAvailingLoan: boolean
  /** Only set when URL has service-type drill; merge separately onto filters. */
  projectServiceType: string[]
}

const EMPTY: Omit<AskProjectsDrillParams, 'projectServiceType'> = {
  panelType: '',
  systemType: '',
  roofType: '',
  statusIndicator: '',
  projectStage: '',
  capacityMin: null,
  capacityMax: null,
  hubPlantLinked: null,
  salespersonName: '',
  opsName: '',
  city: '',
  installationStatus: '',
  paymentMode: '',
  notAvailingLoan: false,
}

function parseNum(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function parseAskProjectsDrillParams(
  p: URLSearchParams,
): AskProjectsDrillParams {
  const systemTypeRaw = (p.get('systemType') || '').trim().toUpperCase()
  const statusIndicatorRaw = (p.get('statusIndicator') || '').trim().toUpperCase()
  const projectStageRaw = (p.get('projectStage') || '').trim().toUpperCase()
  const installationStatusRaw = (p.get('installationStatus') || '').trim().toUpperCase()
  const paymentModeRaw = (p.get('paymentMode') || '').trim().toUpperCase()
  const hubRaw = p.get('hubPlantLinked')
  const serviceRaw = p.getAll('projectServiceType').map((s) => s.trim()).filter(Boolean)

  return {
    panelType: p.get('panelType')?.trim() ?? '',
    systemType: SYSTEM_TYPES.has(systemTypeRaw) ? systemTypeRaw : '',
    roofType: p.get('roofType')?.trim() ?? '',
    statusIndicator: STATUS_INDICATORS.has(statusIndicatorRaw) ? statusIndicatorRaw : '',
    projectStage: PROJECT_STAGES.has(projectStageRaw) ? projectStageRaw : '',
    capacityMin: parseNum(p.get('capacityMin')),
    capacityMax: parseNum(p.get('capacityMax')),
    hubPlantLinked: hubRaw === 'true' ? true : hubRaw === 'false' ? false : null,
    salespersonName: p.get('salespersonName')?.trim() ?? '',
    opsName: p.get('opsName')?.trim() ?? '',
    city: p.get('city')?.trim() ?? '',
    installationStatus: INSTALL_STATUSES.has(installationStatusRaw)
      ? installationStatusRaw
      : '',
    paymentMode: PAYMENT_MODES.has(paymentModeRaw) ? paymentModeRaw : '',
    notAvailingLoan: p.get('notAvailingLoan') === 'true',
    projectServiceType: serviceRaw,
  }
}

export function askProjectsDrillHasAny(d: AskProjectsDrillParams): boolean {
  return (
    d.panelType !== '' ||
    d.systemType !== '' ||
    d.roofType !== '' ||
    d.statusIndicator !== '' ||
    d.projectStage !== '' ||
    d.capacityMin != null ||
    d.capacityMax != null ||
    d.hubPlantLinked != null ||
    d.salespersonName !== '' ||
    d.opsName !== '' ||
    d.city !== '' ||
    d.installationStatus !== '' ||
    d.paymentMode !== '' ||
    d.notAvailingLoan ||
    d.projectServiceType.length > 0
  )
}

/** Deep-link-only fields (excludes projectServiceType which is a panel filter). */
export function emptyAskProjectsDrillParams(): Omit<AskProjectsDrillParams, 'projectServiceType'> {
  return { ...EMPTY }
}

export function askProjectsDrillFilterPatch(
  d: AskProjectsDrillParams,
): Record<string, unknown> {
  return {
    ...EMPTY,
    panelType: d.panelType,
    systemType: d.systemType,
    roofType: d.roofType,
    statusIndicator: d.statusIndicator,
    projectStage: d.projectStage,
    capacityMin: d.capacityMin,
    capacityMax: d.capacityMax,
    hubPlantLinked: d.hubPlantLinked,
    salespersonName: d.salespersonName,
    opsName: d.opsName,
    city: d.city,
    installationStatus: d.installationStatus,
    paymentMode: d.paymentMode,
    notAvailingLoan: d.notAvailingLoan,
    ...(d.projectServiceType.length > 0 ? { projectServiceType: d.projectServiceType } : {}),
  }
}
