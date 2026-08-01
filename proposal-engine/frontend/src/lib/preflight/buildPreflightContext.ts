import { hasValidMapCoordinates } from '../../customers/customerHelpers';
import type { CustomerRecord } from '../customerStore';
import { getResolvedRoofLayout } from '../customerStore';
import { collectProposalAssembly } from '../../proposal/proposalAssembly';
import type { PreflightContext } from './types';

/**
 * Build pre-flight context from the active customer + current include-roof choice.
 */
export function buildPreflightContext(
  activeCustomer: CustomerRecord | null,
  options: { includeRoofLayout: boolean },
): PreflightContext | null {
  const asm = collectProposalAssembly(activeCustomer);
  if (!asm) return null;

  const { sheet, bom, roi } = asm;
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
