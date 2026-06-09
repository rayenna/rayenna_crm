/** Result of parsing a costing/BOM module specification string. */
export type ParsedModuleSpec = {
  /** Portrait width in metres (shorter side). */
  widthM?: number;
  /** Portrait height in metres (longer side). */
  heightM?: number;
  /** Wattage parsed from spec, if any. */
  wattageW?: number;
};

function mmToM(mm: number): number {
  return mm / 1000;
}

/** Normalise two edge lengths to portrait module width × height (m). */
export function normalisePortraitModuleMm(shortMm: number, longMm: number): { widthM: number; heightM: number } {
  const a = mmToM(Math.min(shortMm, longMm));
  const b = mmToM(Math.max(shortMm, longMm));
  return { widthM: a, heightM: b };
}

/**
 * Extract module dimensions (mm) and/or wattage from a PV module SKU line.
 * Examples: "2278×1134 mm", "1134 x 2278", "WAAREE 590NDCR", "540W Mono PERC".
 */
export function parseModuleSpecDimensions(spec: string): ParsedModuleSpec {
  const text = String(spec ?? '').trim();
  if (!text) return {};

  const out: ParsedModuleSpec = {};

  const dimMatch =
    text.match(/(\d{3,4})\s*(?:mm\s*)?[x×*]\s*(\d{3,4})\s*(?:mm)?/i) ??
    text.match(/(\d{3,4})\s*mm\s*[x×*]\s*(\d{3,4})\s*mm/i);
  if (dimMatch) {
    const a = Number(dimMatch[1]);
    const b = Number(dimMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a >= 800 && b >= 800) {
      const { widthM, heightM } = normalisePortraitModuleMm(a, b);
      out.widthM = widthM;
      out.heightM = heightM;
    }
  }

  const rangeW = text.match(/(\d{3,4})\s*[-–]\s*(\d{3,4})\s*(?:W|WP|watts?)?/i);
  if (rangeW) {
    const hi = Math.max(Number(rangeW[1]), Number(rangeW[2]));
    if (Number.isFinite(hi) && hi >= 250 && hi <= 800) out.wattageW = hi;
  } else {
    const singleW = text.match(/(\d{3,4})\s*(?:W|WP|watts?)\b/i);
    if (singleW) {
      const w = Number(singleW[1]);
      if (Number.isFinite(w) && w >= 250 && w <= 800) out.wattageW = w;
    }
  }

  return out;
}
