/**
 * Sales Probability (0–100) — defaults from project status; user-overridable except hygiene locks.
 * KEEP IN SYNC with src/utils/salesProbability.ts
 */

export const SALES_PROBABILITY_BY_STATUS: Record<string, number> = {
  LEAD: 10,
  SITE_SURVEY: 20,
  PROPOSAL: 30,
  CONFIRMED: 75,
  UNDER_INSTALLATION: 100,
  SUBMITTED_FOR_SUBSIDY: 100,
  COMPLETED: 100,
  COMPLETED_SUBSIDY_CREDITED: 100,
  LOST: 0,
}

export function defaultSalesProbabilityForStatus(status: string | null | undefined): number {
  if (!status) return SALES_PROBABILITY_BY_STATUS.LEAD
  return SALES_PROBABILITY_BY_STATUS[status] ?? SALES_PROBABILITY_BY_STATUS.LEAD
}

/** 0–1 win rate from stored % or stage default. */
export function dealWinRateFromFields(opts: {
  salesProbability?: number | null
  projectStatus?: string | null
}): number {
  if (opts.salesProbability != null && Number.isFinite(Number(opts.salesProbability))) {
    const n = Number(opts.salesProbability)
    return Math.min(1, Math.max(0, n / 100))
  }
  return defaultSalesProbabilityForStatus(opts.projectStatus) / 100
}

/** Order value × Sales Probability. */
export function dealExpectedValue(opts: {
  projectCost?: number | null
  salesProbability?: number | null
  projectStatus?: string | null
}): number {
  return (Number(opts.projectCost) || 0) * dealWinRateFromFields(opts)
}

export function isSalesProbabilityLocked(status: string | null | undefined): boolean {
  return status === 'LOST' || status === 'COMPLETED' || status === 'COMPLETED_SUBSIDY_CREDITED'
}

export function applySalesProbabilityHygiene(status: string | null | undefined, value: number): number {
  if (status === 'LOST') return 0
  if (status === 'COMPLETED' || status === 'COMPLETED_SUBSIDY_CREDITED') return 100
  return value
}

export type ParseSalesProbabilityResult =
  | { provided: false }
  | { provided: true; ok: true; value: number }
  | { provided: true; ok: false; error: string }

export function parseSalesProbabilityInput(raw: unknown): ParseSalesProbabilityResult {
  if (raw === undefined || raw === null || raw === '') return { provided: false }
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 100) {
    return {
      provided: true,
      ok: false,
      error: 'Sales Probability must be a whole number from 0 to 100.',
    }
  }
  return { provided: true, ok: true, value: n }
}

export type ResolveSalesProbabilityResult =
  | { ok: true; value?: number }
  | { ok: false; error: string }

export function resolveSalesProbabilityForSave(args: {
  currentStatus: string | null | undefined
  nextStatus: string | null | undefined
  requested: unknown
}): ResolveSalesProbabilityResult {
  const nextStatus = args.nextStatus ?? args.currentStatus ?? 'LEAD'
  const parsed = parseSalesProbabilityInput(args.requested)

  if (parsed.provided && !parsed.ok) return { ok: false, error: parsed.error }

  if (isSalesProbabilityLocked(nextStatus)) {
    return { ok: true, value: defaultSalesProbabilityForStatus(nextStatus) }
  }

  if (parsed.provided && parsed.ok) {
    return { ok: true, value: parsed.value }
  }

  if (args.currentStatus !== nextStatus) {
    return { ok: true, value: defaultSalesProbabilityForStatus(nextStatus) }
  }

  return { ok: true }
}
