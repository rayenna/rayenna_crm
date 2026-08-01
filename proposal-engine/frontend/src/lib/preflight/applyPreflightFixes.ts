import {
  CATEGORY_GST,
  type Category,
} from '../costingConstants';
import { getSubsidyByCapacityKw } from '../roiAssumptions';
import type { PreflightAutoFixId, PreflightNavigateTo, SystemSizeSource } from './types';

export type PreflightApplySheetItem = {
  category: string;
  itemName: string;
  quantity: string;
  gstPercent: string;
  specification?: string;
  unitCost?: string;
};

export type PreflightApplyRoi = {
  systemSizeKw: number;
  tariff: number;
  generationFactor: number;
  escalationPercent?: number;
  projectCost?: number;
  subsidyEligible?: boolean;
  subsidyAmount?: number;
};

export type PreflightApplyInput = {
  selectedFixIds: PreflightAutoFixId[];
  sheetItems: PreflightApplySheetItem[];
  sheetSystemSizeKw?: number | null;
  roi: PreflightApplyRoi | null;
  /** CRM Project Lifecycle panel wattage (W). */
  fallbackPanelWattage?: number | null;
  /** When applying system_size_mismatch. */
  systemSizeSource?: SystemSizeSource;
  crmSystemSizeKw?: number | null;
  costingDerivedKw?: number | null;
};

export type PreflightApplyResult = {
  sheetItems: PreflightApplySheetItem[];
  sheetSystemSizeKw: number | null;
  roi: PreflightApplyRoi | null;
  /** Chosen proposal capacity when size mismatch was applied. */
  proposalSystemSizeKw: number | null;
  /** True when costing lines or sheet size changed. */
  costingChanged: boolean;
  /** True when ROI inputs changed. */
  roiChanged: boolean;
  applied: PreflightAutoFixId[];
  skippedManual: PreflightNavigateTo[];
};

function forceCategoryGst(items: PreflightApplySheetItem[]): {
  items: PreflightApplySheetItem[];
  changed: boolean;
} {
  let changed = false;
  const next = items.map((r) => {
    if (!r.itemName.trim()) return r;
    const cat = r.category in CATEGORY_GST ? (r.category as Category) : 'others';
    const expected = String(CATEGORY_GST[cat] ?? 18);
    const raw = r.gstPercent != null ? String(r.gstPercent).trim() : '';
    if (raw === expected) return r;
    changed = true;
    return { ...r, gstPercent: expected };
  });
  return { items: next, changed };
}

/**
 * Apply selected auto-fixes to in-memory costing / ROI drafts.
 * Does not persist — caller writes via saveProjectArtifacts.
 */
export function applyPreflightFixes(input: PreflightApplyInput): PreflightApplyResult {
  const selected = new Set(input.selectedFixIds);
  const applied: PreflightAutoFixId[] = [];
  const skippedManual: PreflightNavigateTo[] = [];

  let sheetItems = input.sheetItems.map((r) => ({ ...r }));
  let sheetSystemSizeKw =
    input.sheetSystemSizeKw != null && Number.isFinite(input.sheetSystemSizeKw)
      ? Number(input.sheetSystemSizeKw)
      : null;
  let roi = input.roi ? { ...input.roi } : null;
  let proposalSystemSizeKw: number | null = null;
  let costingChanged = false;
  let roiChanged = false;

  if (selected.has('gst_category_default')) {
    const { items, changed } = forceCategoryGst(sheetItems);
    sheetItems = items;
    if (changed) {
      costingChanged = true;
      applied.push('gst_category_default');
    }
  }

  if (selected.has('system_size_mismatch')) {
    const source: SystemSizeSource = input.systemSizeSource ?? 'crm';
    const crmKw =
      input.crmSystemSizeKw != null && Number.isFinite(input.crmSystemSizeKw)
        ? Number(input.crmSystemSizeKw)
        : null;
    const costingKw =
      input.costingDerivedKw != null && Number.isFinite(input.costingDerivedKw)
        ? Number(input.costingDerivedKw)
        : null;
    const chosen =
      source === 'crm'
        ? crmKw != null && crmKw > 0
          ? crmKw
          : null
        : costingKw != null && costingKw > 0
          ? costingKw
          : null;

    if (chosen != null) {
      proposalSystemSizeKw = chosen;
      // Do not rewrite costing line items — only align ROI / proposal capacity for the document.
      if (roi && Math.abs(Number(roi.systemSizeKw) - chosen) > 0.001) {
        roi = { ...roi, systemSizeKw: chosen };
        roiChanged = true;
      }
      applied.push('system_size_mismatch');
    } else {
      skippedManual.push('/roi');
    }
  }

  if (selected.has('subsidy_override_high') && roi?.subsidyEligible) {
    const size = Number(roi.systemSizeKw) > 0 ? Number(roi.systemSizeKw) : 0;
    const scheme = getSubsidyByCapacityKw(size);
    if (scheme > 0 && Number(roi.subsidyAmount ?? 0) > scheme) {
      roi = { ...roi, subsidyAmount: scheme };
      roiChanged = true;
      applied.push('subsidy_override_high');
    }
  }

  if (selected.has('roi_not_integer_kw') && roi) {
    const kw = Number(roi.systemSizeKw);
    if (Number.isFinite(kw) && kw > 0 && !Number.isInteger(kw)) {
      const crmRaw =
        input.crmSystemSizeKw != null && Number.isFinite(input.crmSystemSizeKw)
          ? Number(input.crmSystemSizeKw)
          : null;
      const crmWhole = crmRaw != null && crmRaw > 0 ? Math.round(crmRaw) : null;
      // Prefer CRM Project System Capacity; otherwise round near-integers only.
      const target =
        crmWhole != null && crmWhole > 0
          ? crmWhole
          : Math.abs(kw - Math.round(kw)) <= 0.05
            ? Math.round(kw)
            : null;
      if (target != null) {
        roi = { ...roi, systemSizeKw: target };
        roiChanged = true;
        if (proposalSystemSizeKw == null) proposalSystemSizeKw = target;
        applied.push('roi_not_integer_kw');
      } else {
        skippedManual.push('/roi');
      }
    }
  }

  return {
    sheetItems,
    sheetSystemSizeKw,
    roi,
    proposalSystemSizeKw,
    costingChanged,
    roiChanged,
    applied,
    skippedManual: [...new Set(skippedManual)],
  };
}
