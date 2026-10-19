import { CATEGORY_GST, specificationWithModuleWatts } from './costingConstants';
import type { LineItem } from './costingConstants';

export type ApplyRoofLayoutResult = {
  items: LineItem[];
  summary: string;
};

function moduleIndexes(items: LineItem[]): number[] {
  return items
    .map((row, index) => (row.category === 'pv-modules' ? index : -1))
    .filter((index) => index >= 0);
}

/**
 * Copy a saved roof layout onto the PV module line.
 * Quantity becomes the placed panel count. When CRM (or caller) watts are known,
 * the specification is stamped with that exact wattage so proposal size matches the layout.
 */
export function applyRoofLayoutToModuleLines(
  items: LineItem[],
  input: { panelCount: number; moduleWatts: number | null; panelBrand?: string | null },
): ApplyRoofLayoutResult {
  const panelCount = Math.round(input.panelCount);
  const watts =
    input.moduleWatts != null && Number.isFinite(input.moduleWatts) && input.moduleWatts > 0
      ? Math.round(input.moduleWatts)
      : null;
  const next = items.map((row) => ({ ...row }));
  const indexes = moduleIndexes(next);
  const named = indexes.filter((index) => next[index].itemName.trim());
  const targetIndex = named[0] ?? indexes[0];

  if (targetIndex == null) {
    const brand = input.panelBrand?.trim();
    next.unshift({
      category: 'pv-modules',
      itemName: brand ? `${brand} PV Module` : 'PV Module',
      specification: watts != null ? `${watts}W` : '',
      quantity: String(panelCount),
      unitCost: '',
      gstPercent: String(CATEGORY_GST['pv-modules']),
    });
  } else {
    const row = next[targetIndex];
    next[targetIndex] = {
      ...row,
      itemName: row.itemName.trim() || (input.panelBrand?.trim() ? `${input.panelBrand.trim()} PV Module` : 'PV Module'),
      quantity: String(panelCount),
      specification: watts != null ? specificationWithModuleWatts(row.specification, watts) : row.specification,
    };
    for (const index of named.slice(1)) {
      next[index] = { ...next[index], quantity: '0' };
    }
  }

  const extra = Math.max(0, named.length - 1);
  const kw = watts != null ? Math.round((panelCount * watts) / 10) / 100 : null;
  const size = kw != null ? ` (${kw.toFixed(2)} kW)` : '';
  const wattsNote =
    watts != null
      ? `${panelCount} × ${watts} W${size}`
      : `${panelCount} panels. Add a wattage such as 600W, or set panel watts on the CRM project, so the proposal size matches`;
  const extraNote =
    extra > 0 ? ' Other module lines were set to quantity 0 so the size matches the layout.' : '';

  return {
    items: next,
    summary: `Module line set to ${wattsNote}. Save the sheet to keep it.${extraNote}`,
  };
}
