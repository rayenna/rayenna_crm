import { hasValidMapCoordinates } from '../../customers/customerHelpers';
import type { BomRowGenerated, SavedSheet } from '../costingConstants';
import type { CustomerRecord } from '../customerStore';
import { getResolvedRoofLayout } from '../customerStore';
import { collectProposalAssembly } from '../../proposal/proposalAssembly';
import type { ProposalData, ROIResult } from '../../proposal/types';
import type { PreflightContext } from './types';

export type PreflightProposalSnapshot = Pick<ProposalData, 'sheet' | 'bom' | 'roi'> | null;

/**
 * Build pre-flight context from the active customer + current include-roof choice.
 * Optional proposalSnapshot fills sheet/BOM/ROI when local store still has light blobs
 * (empty items/rows after project detail load) but the rendered proposal already has them.
 */
export function buildPreflightContext(
  activeCustomer: CustomerRecord | null,
  options: {
    includeRoofLayout: boolean;
    proposalSnapshot?: PreflightProposalSnapshot;
  },
): PreflightContext | null {
  const asm = collectProposalAssembly(activeCustomer);
  if (!asm) return null;

  const snap = options.proposalSnapshot ?? null;
  let sheet: SavedSheet | null = asm.sheet;
  if ((!sheet?.items || sheet.items.length === 0) && snap?.sheet?.items?.length) {
    sheet = snap.sheet;
  }

  let bom: BomRowGenerated[] = asm.bom;
  if (bom.length === 0 && snap?.bom?.length) {
    bom = snap.bom;
  }

  let roi: ROIResult | null = asm.roi;
  if (!roi && snap?.roi) {
    roi = snap.roi;
  }

  const master = activeCustomer?.master;
  const resolvedRoof = activeCustomer ? getResolvedRoofLayout(activeCustomer) : null;
  const panelW =
    typeof master?.panelWattage === 'number' && master.panelWattage > 0
      ? master.panelWattage
      : 550;
  const placedKw =
    resolvedRoof && resolvedRoof.panel_count > 0
      ? (resolvedRoof.panel_count * panelW) / 1000
      : null;

  return {
    crmSystemSizeKw:
      typeof master?.systemSizeKw === 'number' ? master.systemSizeKw : null,
    crmPanelWattage:
      typeof master?.panelWattage === 'number' && master.panelWattage > 0
        ? master.panelWattage
        : null,
    sheetItems: (sheet?.items ?? []).map((r) => ({
      category: r.category,
      itemName: r.itemName,
      quantity: r.quantity,
      gstPercent: r.gstPercent ?? '',
      specification: r.specification ?? '',
    })),
    sheetSystemSizeKw: sheet?.systemSizeKw ?? null,
    bomRows: bom.map((r) => ({
      category: r.category,
      itemName: r.itemName,
      quantity: r.quantity,
      specification: r.specification,
    })),
    roi: roi
      ? {
          systemSizeKw: Number(roi.inputs.systemSizeKw),
          tariff: Number(roi.inputs.tariff),
          generationFactor: Number(roi.inputs.generationFactor),
          subsidyEligible: !!roi.inputs.subsidyEligible,
          subsidyAmount: roi.inputs.subsidyAmount,
        }
      : null,
    roof: {
      includeRoofLayout: options.includeRoofLayout,
      hasSavedLayout: !!resolvedRoof,
      hasValidGps: hasValidMapCoordinates(master?.latitude, master?.longitude),
      placedSystemSizeKw: placedKw,
    },
  };
}
