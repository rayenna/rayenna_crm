import type { BomArtifact, CostingArtifact } from '../customerStore';

export type PvModuleArtifactLine = {
  source: 'costing' | 'bom';
  itemName: string;
  specification: string;
  brand: string;
};

const PV_MODULE_NAME = /(?:\bpv\b|\bsolar\b|\bmodule\b|\bpanel\b)/i;

function isPvModuleRow(itemName: string, specification: string): boolean {
  const combined = `${itemName} ${specification}`;
  return PV_MODULE_NAME.test(combined);
}

/** First PV module line from saved costing (preferred) or BOM. */
export function findPvModuleArtifactLine(
  costing: CostingArtifact | null | undefined,
  bom: BomArtifact | null | undefined,
): PvModuleArtifactLine | null {
  const costingItem = costing?.items?.find(
    (row) => row.category === 'pv-modules' && String(row.itemName ?? '').trim(),
  );
  if (costingItem) {
    return {
      source: 'costing',
      itemName: String(costingItem.itemName ?? '').trim(),
      specification: String(costingItem.specification ?? '').trim(),
      brand: '',
    };
  }

  const bomRow = bom?.rows?.find((row) =>
    isPvModuleRow(String(row.itemName ?? ''), String(row.specification ?? '')),
  );
  if (bomRow) {
    return {
      source: 'bom',
      itemName: String(bomRow.itemName ?? '').trim(),
      specification: String(bomRow.specification ?? '').trim(),
      brand: String(bomRow.brand ?? '').trim(),
    };
  }

  return null;
}
