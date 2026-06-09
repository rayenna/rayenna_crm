/**
 * Known PV module footprints (portrait width × height in metres) by CRM brand + wattage.
 * Used when BOM/costing lines lack explicit mm dimensions.
 * Fallback remains wattage-only table in roofLayoutConstants.ts.
 */

export type ModuleSkuCatalogEntry = {
  brandPattern: RegExp;
  wattageMin: number;
  wattageMax: number;
  widthM: number;
  heightM: number;
  label: string;
};

/** Longer edge is height in portrait orientation. */
export const MODULE_SKU_CATALOG: ModuleSkuCatalogEntry[] = [
  {
    brandPattern: /waaree/i,
    wattageMin: 540,
    wattageMax: 600,
    widthM: 1.134,
    heightM: 2.278,
    label: 'Waaree TOPCon (catalog)',
  },
  {
    brandPattern: /adani/i,
    wattageMin: 600,
    wattageMax: 620,
    widthM: 1.303,
    heightM: 2.384,
    label: 'Adani TOPCon 600–620 (catalog)',
  },
  {
    brandPattern: /renewsys/i,
    wattageMin: 600,
    wattageMax: 620,
    widthM: 1.134,
    heightM: 2.278,
    label: 'RenewSys bifacial (catalog)',
  },
  {
    brandPattern: /jinko|trina|longi|canadian\s*solar/i,
    wattageMin: 530,
    wattageMax: 580,
    widthM: 1.134,
    heightM: 2.278,
    label: 'Tier-1 mono PERC (catalog)',
  },
];

export function lookupModuleSkuCatalog(
  panelBrand: string | null | undefined,
  panelWattage: number,
): { widthM: number; heightM: number; label: string } | null {
  const brand = String(panelBrand ?? '').trim();
  if (!brand) return null;
  const w = Math.round(panelWattage);
  if (!Number.isFinite(w) || w <= 0) return null;

  for (const entry of MODULE_SKU_CATALOG) {
    if (!entry.brandPattern.test(brand)) continue;
    if (w >= entry.wattageMin && w <= entry.wattageMax) {
      return { widthM: entry.widthM, heightM: entry.heightM, label: entry.label };
    }
  }
  return null;
}
