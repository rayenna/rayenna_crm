/**
 * Sales Probability (0–100) — defaults from project status; user-overridable except hygiene locks.
 * KEEP IN SYNC with client/src/utils/salesProbability.ts
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
};

export function defaultSalesProbabilityForStatus(status: string | null | undefined): number {
  if (!status) return SALES_PROBABILITY_BY_STATUS.LEAD;
  return SALES_PROBABILITY_BY_STATUS[status] ?? SALES_PROBABILITY_BY_STATUS.LEAD;
}

export function isSalesProbabilityLocked(status: string | null | undefined): boolean {
  return status === 'LOST' || status === 'COMPLETED' || status === 'COMPLETED_SUBSIDY_CREDITED';
}

export function applySalesProbabilityHygiene(status: string | null | undefined, value: number): number {
  if (status === 'LOST') return 0;
  if (status === 'COMPLETED' || status === 'COMPLETED_SUBSIDY_CREDITED') return 100;
  return value;
}

export type ParseSalesProbabilityResult =
  | { provided: false }
  | { provided: true; ok: true; value: number }
  | { provided: true; ok: false; error: string };

export function parseSalesProbabilityInput(raw: unknown): ParseSalesProbabilityResult {
  if (raw === undefined || raw === null || raw === '') return { provided: false };
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 100) {
    return {
      provided: true,
      ok: false,
      error: 'Sales Probability must be a whole number from 0 to 100.',
    };
  }
  return { provided: true, ok: true, value: n };
}

export type ResolveSalesProbabilityResult =
  | { ok: true; value?: number }
  | { ok: false; error: string };

/**
 * Create/update resolution:
 * - Locked statuses always store the required value (Lost 0, Completed 100).
 * - If the client sent a valid number, keep it (then hygiene).
 * - If status changed and no number was sent, pre-populate the status default.
 * - Otherwise leave the stored value unchanged (`value` omitted).
 */
export function resolveSalesProbabilityForSave(args: {
  currentStatus: string | null | undefined;
  nextStatus: string | null | undefined;
  requested: unknown;
}): ResolveSalesProbabilityResult {
  const nextStatus = args.nextStatus ?? args.currentStatus ?? 'LEAD';
  const parsed = parseSalesProbabilityInput(args.requested);

  if (parsed.provided && !parsed.ok) return { ok: false, error: parsed.error };

  if (isSalesProbabilityLocked(nextStatus)) {
    return { ok: true, value: defaultSalesProbabilityForStatus(nextStatus) };
  }

  if (parsed.provided && parsed.ok) {
    return { ok: true, value: parsed.value };
  }

  if (args.currentStatus !== nextStatus) {
    return { ok: true, value: defaultSalesProbabilityForStatus(nextStatus) };
  }

  return { ok: true };
}
