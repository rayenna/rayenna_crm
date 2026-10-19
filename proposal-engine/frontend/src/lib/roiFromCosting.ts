import { calculateROI } from './calculateRoi';
import type { RoiArtifact, ROIResult } from './customerStore';
import {
  DEFAULT_GENERATION_FACTOR,
  DEFAULT_TARIFF_INR,
  getSubsidyByCapacityKw,
} from './roiAssumptions';

const DEFAULT_ESCALATION_PERCENT = 5;

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Commercial and industrial jobs do not get the household subsidy unless ROI was already marked eligible. */
export function isCommercialSegment(segment?: string | null): boolean {
  return /commercial|industrial|enterprise/i.test(segment ?? '');
}

/**
 * Whole kW for ROI. CRM capacity wins (rounded, same as the ROI page).
 * Without CRM, use costing kW only when it is already a whole number.
 */
export function resolveRoiSystemSizeKw(
  crmSystemSizeKw?: number | null,
  costingSystemSizeKw?: number | null,
): number | null {
  if (crmSystemSizeKw != null && Number.isFinite(crmSystemSizeKw) && crmSystemSizeKw > 0) {
    const rounded = Math.round(crmSystemSizeKw);
    return rounded > 0 ? rounded : null;
  }
  if (
    costingSystemSizeKw != null &&
    Number.isFinite(costingSystemSizeKw) &&
    costingSystemSizeKw > 0
  ) {
    const rounded = Math.round(costingSystemSizeKw);
    if (rounded > 0 && Math.abs(costingSystemSizeKw - rounded) <= 0.001) return rounded;
  }
  return null;
}

export type RoiFromCosting = {
  artifact: RoiArtifact;
  summary: string;
};

/**
 * Payback saved with the costing sheet.
 * Keeps a previously saved tariff, generation factor, escalation, and subsidy choice.
 * First save uses CRM tariff when present, otherwise ₹8.20 / 1,500 kWh/kW/year,
 * and the PM Surya Ghar slab unless the segment is commercial.
 */
export function buildRoiFromCosting(input: {
  grandTotal: number;
  costingSystemSizeKw: number;
  crmSystemSizeKw?: number | null;
  crmTariff?: number | null;
  segment?: string | null;
  existing?: ROIResult | null;
  savedAt: string;
}): RoiFromCosting | null {
  const systemSizeKw = resolveRoiSystemSizeKw(input.crmSystemSizeKw, input.costingSystemSizeKw);
  if (systemSizeKw == null) return null;

  const existing = input.existing?.inputs;
  const tariff =
    positive(existing?.tariff) ?? positive(input.crmTariff) ?? DEFAULT_TARIFF_INR;
  const generationFactor =
    positive(existing?.generationFactor) ?? DEFAULT_GENERATION_FACTOR;
  const escalationPercent =
    existing != null && Number.isFinite(existing.escalationPercent) && existing.escalationPercent >= 0
      ? existing.escalationPercent
      : DEFAULT_ESCALATION_PERCENT;

  const scheme = getSubsidyByCapacityKw(systemSizeKw);
  let subsidyEligible = false;
  let subsidyAmount: number | undefined;

  if (existing?.subsidyEligible) {
    const oldSize = positive(existing.systemSizeKw) ?? systemSizeKw;
    const oldScheme = getSubsidyByCapacityKw(Math.round(oldSize));
    const oldAmount = existing.subsidyAmount ?? 0;
    const hadOverride = oldAmount > 0 && oldAmount !== oldScheme;
    subsidyAmount = hadOverride ? Math.round(oldAmount) : scheme;
    subsidyEligible = subsidyAmount > 0;
  } else if (existing && existing.subsidyEligible === false) {
    subsidyEligible = false;
  } else if (!isCommercialSegment(input.segment) && scheme > 0) {
    subsidyEligible = true;
    subsidyAmount = scheme;
  }

  const result = calculateROI({
    systemSizeKw,
    tariff,
    generationFactor,
    escalationPercent,
    projectCost: Math.round(input.grandTotal),
    subsidyEligible: subsidyEligible && (subsidyAmount ?? 0) > 0,
    subsidyAmount: subsidyEligible && (subsidyAmount ?? 0) > 0 ? subsidyAmount : undefined,
  });

  const payback = result.paybackYears.toFixed(1);
  const subsidyNote =
    result.inputs.subsidyEligible && (result.inputs.subsidyAmount ?? 0) > 0
      ? `subsidy ₹${Math.round(result.inputs.subsidyAmount!).toLocaleString('en-IN')}`
      : isCommercialSegment(input.segment)
        ? 'no household subsidy (commercial)'
        : 'no subsidy';

  return {
    artifact: { savedAt: input.savedAt, result },
    summary: `ROI saved · ${systemSizeKw} kW · payback ${payback} yrs · ${subsidyNote}`,
  };
}
