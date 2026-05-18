import type { SavedSheet, StoredBom, BomRowGenerated, RoiAutofill } from '../lib/costingConstants';
import { getWipKeysForCurrentUser } from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import type { BomOverrides, CustomerDetails, ProposalData, ProposalMeta, ROIResult } from './types';

export function genRef(meta?: ProposalMeta): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const parts: string[] = ['REY', String(year), month];

  if (meta?.projectNumber != null) {
    parts.push(`PRJ-${String(meta.projectNumber).padStart(4, '0')}`);
  }

  if (meta?.customerNumber) {
    parts.push(`CUST-${meta.customerNumber}`);
  }

  if (!meta?.projectNumber || !meta?.customerNumber) {
    parts.push(String(Date.now()).slice(-5));
  }

  return parts.join('/');
}

export function readWipStorage<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

export function getLatestSheet(): SavedSheet | null {
  const key = getWipKeysForCurrentUser().sheets;
  const sheets: SavedSheet[] | null = readWipStorage(key);
  if (!sheets || !sheets.length) return null;
  return sheets.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0];
}

export function getBom(): BomRowGenerated[] {
  const wip = getWipKeysForCurrentUser();
  const overrides: BomOverrides | null = readWipStorage(wip.bomOverrides);
  if (overrides && overrides.rows.length) return overrides.rows;
  const stored: StoredBom | null = readWipStorage(wip.bomCosting);
  if (stored && stored.rows.length) return stored.rows;
  return [];
}

/** Sheet / BOM / ROI / meta for building or restoring a proposal from the active customer record. */
export function collectProposalAssembly(activeCustomer: CustomerRecord | null): {
  customer: CustomerDetails;
  sheet: SavedSheet | null;
  bom: BomRowGenerated[];
  roi: ROIResult | null;
  roiAutofill: RoiAutofill | null;
  meta: ProposalMeta | undefined;
} | null {
  if (!activeCustomer) return null;

  const sheet: SavedSheet | null = activeCustomer.costing
    ? {
        id:            `sheet_${activeCustomer.id}`,
        name:          activeCustomer.costing.sheetName,
        description:   '',
        savedAt:       activeCustomer.costing.savedAt,
        items:         activeCustomer.costing.items,
        showGst:       activeCustomer.costing.showGst,
        marginPercent: activeCustomer.costing.marginPercent,
        grandTotal:    activeCustomer.costing.grandTotal,
        totalGst:      activeCustomer.costing.totalGst,
        systemSizeKw:  activeCustomer.costing.systemSizeKw,
      }
    : getLatestSheet();

  const bom: BomRowGenerated[] =
    activeCustomer.bom?.rows && activeCustomer.bom.rows.length > 0
      ? (activeCustomer.bom.rows as unknown as BomRowGenerated[])
      : getBom();

  const wip = getWipKeysForCurrentUser();
  const roi: ROIResult | null =
    (activeCustomer.roi?.result as ROIResult | null) ?? readWipStorage(wip.roiResult);

  const roiAutofill: RoiAutofill | null = activeCustomer.costing
    ? {
        source:       'costing-sheet',
        sourceName:   activeCustomer.costing.sheetName,
        savedAt:      activeCustomer.costing.savedAt,
        systemSizeKw: activeCustomer.costing.systemSizeKw,
        grandTotal:   activeCustomer.costing.grandTotal,
      }
    : readWipStorage(wip.roiAutofill);

  const meta: ProposalMeta | undefined = {
    customerNumber: activeCustomer.master.customerNumber ?? undefined,
    projectNumber:  activeCustomer.master.projectNumber ?? undefined,
  };

  const customer: CustomerDetails = {
    customerName:  activeCustomer.master.name ?? '',
    location:      activeCustomer.master.location ?? '',
    contactPerson: activeCustomer.master.contactPerson ?? '',
    phone:         activeCustomer.master.phone ?? '',
    email:         activeCustomer.master.email ?? '',
  };

  return { customer, sheet, bom, roi, roiAutofill, meta };
}

// ─────────────────────────────────────────────
// Template text generator
// ─────────────────────────────────────────────

export function buildProposal(
  customer: CustomerDetails,
  sheet: SavedSheet | null,
  bom: BomRowGenerated[],
  roi: ROIResult | null,
  roiAutofill: RoiAutofill | null,
  meta?: ProposalMeta,
): ProposalData {
  const sizeKw = roiAutofill?.systemSizeKw ?? sheet?.systemSizeKw ?? 0;
  return {
    refNumber:   genRef(meta),
    generatedAt: new Date().toISOString(),
    customer,
    systemSizeKw: sizeKw,
    sheet,
    bom,
    roi,
    roiAutofill,
    customerNumber: meta?.customerNumber ?? null,
    projectNumber:  meta?.projectNumber ?? null,
  };
}

/** Restore ref/timestamp from a saved proposal artifact (after Generate was run at least once). */
export function rehydrateProposalData(
  saved: { refNumber: string; generatedAt: string },
  customer: CustomerDetails,
  sheet: SavedSheet | null,
  bom: BomRowGenerated[],
  roi: ROIResult | null,
  roiAutofill: RoiAutofill | null,
  meta?: ProposalMeta,
): ProposalData {
  const sizeKw = roiAutofill?.systemSizeKw ?? sheet?.systemSizeKw ?? 0;
  return {
    refNumber:      saved.refNumber,
    generatedAt:    saved.generatedAt,
    customer,
    systemSizeKw:   sizeKw,
    sheet,
    bom,
    roi,
    roiAutofill,
    customerNumber: meta?.customerNumber ?? null,
    projectNumber:  meta?.projectNumber ?? null,
  };
}

export function cloneProposalForStorage(p: ProposalData): ProposalData {
  return JSON.parse(JSON.stringify(p)) as ProposalData;
}

export function parseStoredProposalView(raw: unknown): ProposalData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ProposalData>;
  if (typeof r.refNumber !== 'string' || typeof r.generatedAt !== 'string') return null;
  return r as ProposalData;
}
