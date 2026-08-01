import type { Project, User } from '../types'
import { canFixSystemCapacity } from './lifecycleDataQuality'

/** Prefer costing size; fall back to ROI. */
export type PeCapacitySource = 'costing' | 'roi'

export type PeSyncCapacitySnapshot = {
  costingSystemSizeKw?: number | null
  roiSystemSizeKw?: number | null
}

export type PeCapacityDriftFinding = {
  id: 'systemCapacity'
  field: 'systemCapacity'
  label: string
  crmValue: number | null
  peValue: number
  peSource: PeCapacitySource
  detail: string
}

/** Float / rounding noise only — not commercial tolerance. */
export const CAPACITY_DRIFT_TOLERANCE_KW = 0.1

/**
 * Costing may exceed CRM commercial capacity by up to this much for redundancy
 * (e.g. CRM 3 kW → costing 3.2–4.0 is OK; &lt;3 or &gt;4 is flagged).
 */
export const CAPACITY_REDUNDANCY_MAX_EXTRA_KW = 1

function asPositiveKw(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

/** Pick PE capacity from costing first, then ROI. */
export function pickPeSystemSizeKw(
  snap: PeSyncCapacitySnapshot | null | undefined,
): { kw: number; source: PeCapacitySource } | null {
  if (!snap) return null
  const costing = asPositiveKw(snap.costingSystemSizeKw)
  if (costing != null) return { kw: costing, source: 'costing' }
  const roi = asPositiveKw(snap.roiSystemSizeKw)
  if (roi != null) return { kw: roi, source: 'roi' }
  return null
}

/** Exact/near-equal compare (legacy helper; steward band uses {@link isCostingCapacityOutOfBand}). */
export function capacitiesDiffer(crmKw: number | null, peKw: number): boolean {
  if (crmKw == null || !Number.isFinite(crmKw) || crmKw <= 0) return true
  return Math.abs(crmKw - peKw) > CAPACITY_DRIFT_TOLERANCE_KW
}

/**
 * True when PE costing capacity is outside the expected band vs CRM commercial size:
 * below CRM, or more than {@link CAPACITY_REDUNDANCY_MAX_EXTRA_KW} above CRM.
 * Small redundancy bumps (e.g. 3 → 3.2 / 3.3) are not flagged.
 */
export function isCostingCapacityOutOfBand(crmKw: number | null, costingKw: number): boolean {
  if (crmKw == null || !Number.isFinite(crmKw) || crmKw <= 0) return true
  if (costingKw < crmKw) return true
  if (costingKw > crmKw + CAPACITY_REDUNDANCY_MAX_EXTRA_KW) return true
  return false
}

/**
 * Detect CRM systemCapacity vs PE costing sheet size only.
 * ROI / Zenith use CRM capacity — do not compare ROI here.
 * Brands / panel W are CRM→PE mirrors — not compared in v1.
 */
export function evaluatePeCapacityDrift(
  project: Project,
  snap: PeSyncCapacitySnapshot | null | undefined,
): PeCapacityDriftFinding[] {
  const costingKw = asPositiveKw(snap?.costingSystemSizeKw)
  if (costingKw == null) return []

  const crmRaw = asPositiveKw(project.systemCapacity)
  if (!isCostingCapacityOutOfBand(crmRaw, costingKw)) return []

  const crmLabel = crmRaw != null ? `${crmRaw} kW` : 'not set'
  const bandHi =
    crmRaw != null && Number.isFinite(crmRaw) ? crmRaw + CAPACITY_REDUNDANCY_MAX_EXTRA_KW : null
  const bandHint =
    crmRaw != null && bandHi != null
      ? ` Expected costing in [${crmRaw}–${bandHi}] kW (CRM size to +${CAPACITY_REDUNDANCY_MAX_EXTRA_KW} kW redundancy).`
      : ''

  return [
    {
      id: 'systemCapacity',
      field: 'systemCapacity',
      label: 'Costing capacity outside expected band',
      crmValue: crmRaw,
      peValue: costingKw,
      peSource: 'costing',
      detail: `CRM commercial capacity is ${crmLabel}; PE costing sheet has ${costingKw} kW.${bandHint} ROI and Zenith use CRM — apply only if CRM itself should change.`,
    },
  ]
}

/** Whole-number kW preferred for CRM commercial capacity (aligned with PE ROI whole-kW work). */
export function peCapacityToCrmPatchValue(peKw: number): number {
  if (!Number.isFinite(peKw) || peKw <= 0) return peKw
  const rounded = Math.round(peKw)
  return Math.abs(peKw - rounded) < CAPACITY_DRIFT_TOLERANCE_KW ? rounded : Math.round(peKw * 10) / 10
}

export function canApplyPeCapacityToCrm(
  project: Project | null | undefined,
  user: User | null | undefined,
): boolean {
  return canFixSystemCapacity(project, user)
}
