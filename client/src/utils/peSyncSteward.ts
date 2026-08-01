import type { Project, User } from '../types'
import { canFixSystemCapacity } from './lifecycleDataQuality'

/** Prefer costing size; fall back to ROI inputs. */
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

/** Same spirit as PE pre-flight mismatch tolerance. */
export const CAPACITY_DRIFT_TOLERANCE_KW = 0.1

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

export function capacitiesDiffer(crmKw: number | null, peKw: number): boolean {
  if (crmKw == null || !Number.isFinite(crmKw) || crmKw <= 0) return true
  return Math.abs(crmKw - peKw) > CAPACITY_DRIFT_TOLERANCE_KW
}

/**
 * Detect CRM systemCapacity drift vs PE costing/ROI system size.
 * Brands / panel W are CRM→PE mirrors today — not compared in v1.
 */
export function evaluatePeCapacityDrift(
  project: Project,
  snap: PeSyncCapacitySnapshot | null | undefined,
): PeCapacityDriftFinding[] {
  const pe = pickPeSystemSizeKw(snap)
  if (!pe) return []

  const crmRaw = asPositiveKw(project.systemCapacity)
  if (!capacitiesDiffer(crmRaw, pe.kw)) return []

  const crmLabel = crmRaw != null ? `${crmRaw} kW` : 'not set'
  const sourceLabel = pe.source === 'costing' ? 'PE costing' : 'PE ROI'

  return [
    {
      id: 'systemCapacity',
      field: 'systemCapacity',
      label: 'System capacity mismatch',
      crmValue: crmRaw,
      peValue: pe.kw,
      peSource: pe.source,
      detail: `CRM has ${crmLabel}; ${sourceLabel} has ${pe.kw} kW. Proposal Engine remains the proposal SSOT — apply only if CRM should match PE for Ops/Zenith.`,
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
