/**
 * Deterministic extraction / normalization of panel, inverter, and financing-bank
 * entities from Zenith Ask questions (complements Claude intent JSON).
 */

export const PANEL_BRAND_CANONICAL = [
  'Adani Solar',
  'Azure Power',
  'Emmvee',
  'Goldi Solar',
  'Hartek Group',
  'Jakson',
  'L&T Solar',
  'Loom Solar',
  'Luminous',
  'Microtek',
  'Moser Baer',
  'Premier Energies',
  'Rayzon Solar',
  'ReNew',
  'Renewsys',
  'Saatvik',
  'Servotech',
  'Tata Power Solar',
  'V-Guard',
  'Vikram Solar',
  'Waaree',
  'Others',
] as const;

export const INVERTER_BRAND_CANONICAL = [
  'Delta',
  'Eastman',
  'Deye',
  'Feston',
  'FIMER',
  'Fronius',
  'GoodWe',
  'Gronsol',
  'Growatt',
  'Havells',
  'Livguard',
  'Luminous',
  'Microtek',
  'Panasonic',
  'Polycab',
  'Selec',
  'Seltrik',
  'Solaire',
  'Solis',
  'Sungrow',
  'Sunways',
  'Tata Power Solar',
  'UTL Solar',
  'V-Guard',
  'Others',
] as const;

/** Stored `financingBank` enum → display aliases users may say. */
export const FINANCING_BANK_ALIASES: Record<string, string[]> = {
  SBI: ['sbi', 'state bank of india', 'state bank'],
  HDFC_BANK: ['hdfc', 'hdfc bank'],
  ICICI_BANK: ['icici', 'icici bank'],
  AXIS_BANK: ['axis', 'axis bank'],
  KOTAK_MAHINDRA_BANK: ['kotak', 'kotak mahindra', 'kotak bank'],
  INDUSIND_BANK: ['indusind', 'indusind bank'],
  YES_BANK: ['yes bank'],
  IDFC_FIRST_BANK: ['idfc', 'idfc first', 'idfc first bank'],
  PUNJAB_NATIONAL_BANK: ['pnb', 'punjab national bank'],
  BANK_OF_BARODA: ['bob', 'bank of baroda', 'baroda'],
  CANARA_BANK: ['canara', 'canara bank'],
  UNION_BANK_OF_INDIA: ['union bank', 'union bank of india'],
  FEDERAL_BANK: ['federal', 'federal bank'],
  SOUTH_INDIAN_BANK: ['south indian bank', 'sib'],
  CATHOLIC_SYRIAN_BANK: ['catholic syrian', 'csb', 'csb bank'],
  DHANLAXMI_BANK: ['dhanlaxmi', 'dhanlaxmi bank'],
  KERALA_GRAMIN_BANK: ['kerala gramin', 'kgb'],
  KERALA_BANK: ['kerala bank'],
  KARNATAKA_BANK: ['karnataka bank'],
  RBL_BANK: ['rbl', 'rbl bank'],
  TAMILNADU_MERCANTILE_BANK: ['tmb', 'tamilnadu mercantile'],
  CITY_UNION_BANK: ['city union', 'cub'],
  INDIAN_BANK: ['indian bank'],
  INDIAN_OVERSEAS_BANK: ['iob', 'indian overseas'],
  DCB_BANK: ['dcb', 'dcb bank'],
  KARUR_VYSYA_BANK: ['karur vysya', 'kvb'],
  BANDHAN_BANK: ['bandhan', 'bandhan bank'],
  BANK_OF_INDIA: ['bank of india', 'boi'],
  BANK_OF_MAHARASHTRA: ['bank of maharashtra'],
  IDBI_BANK: ['idbi', 'idbi bank'],
  ESAF_SMALL_FINANCE_BANK: ['esaf'],
  EQUITAS_SMALL_FINANCE_BANK: ['equitas'],
  UJJIVAN_SMALL_FINANCE_BANK: ['ujjivan'],
  AU_SMALL_FINANCE_BANK: ['au bank', 'au small finance'],
  OTHER: ['other bank'],
};

export type ExtractedZenithEntities = {
  panelBrand?: string;
  inverterBrand?: string;
  financingBank?: string;
  availingLoan?: boolean;
  /** True when question looks like a count / how-many ask. */
  wantsCount?: boolean;
  /** True when question looks like revenue / order-value ask. */
  wantsRevenue?: boolean;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(q: string): string {
  return q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9&./\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip common trailing corporate words for fuzzy brand match. */
function brandMatchToken(canonical: string): string {
  return canonical
    .replace(/\s+(solar|power|energies|group|bank)$/i, '')
    .trim() || canonical;
}

function findBrandInQuestion(
  qNorm: string,
  brands: readonly string[],
  context?: { requireEquipmentHint?: boolean; equipmentHints?: RegExp },
): string | undefined {
  const scored: { brand: string; score: number }[] = [];
  for (const brand of brands) {
    if (brand === 'Others') continue;
    const full = brand.toLowerCase();
    const token = brandMatchToken(brand).toLowerCase();
    const candidates = Array.from(new Set([full, token].filter((t) => t.length >= 3)));
    for (const c of candidates) {
      const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(c)}(?:[^a-z0-9]|$)`, 'i');
      if (!re.test(qNorm)) continue;
      // Prefer longer matches (Adani Solar over shorter collisions).
      scored.push({ brand, score: c.length });
      break;
    }
  }
  if (scored.length === 0) return undefined;
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]!.brand;
  if (context?.requireEquipmentHint && context.equipmentHints && !context.equipmentHints.test(qNorm)) {
    // Still accept strong full-name hits (e.g. "Deye" alone is an inverter brand).
    const token = brandMatchToken(best).toLowerCase();
    if (token.length < 5 && !qNorm.includes(best.toLowerCase())) return undefined;
  }
  return best;
}

function findFinancingBank(qNorm: string): string | undefined {
  let best: { key: string; score: number } | null = null;
  for (const [key, aliases] of Object.entries(FINANCING_BANK_ALIASES)) {
    for (const alias of aliases) {
      const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(alias)}(?:[^a-z0-9]|$)`, 'i');
      if (!re.test(qNorm)) continue;
      const score = alias.length;
      if (!best || score > best.score) best = { key, score };
    }
    // Also accept raw enum style "hdfc_bank"
    const enumAlias = key.toLowerCase().replace(/_/g, ' ');
    const reEnum = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(key.toLowerCase())}(?:[^a-z0-9]|$)`, 'i');
    if (reEnum.test(qNorm) || qNorm.includes(enumAlias)) {
      const score = key.length;
      if (!best || score > best.score) best = { key, score };
    }
  }
  return best?.key;
}

const PANEL_HINT = /\b(panel|panels|module|modules|pv\b|adani solar|waaree|vikram)/i;
const INVERTER_HINT = /\b(inverter|inverters|hybrid|string inverter|deye|growatt|goodwe|sungrow|sunways)/i;
const LOAN_HINT = /\b(loan|loans|financ(?:e|ing)|emi|bank)\b/i;

/**
 * Pull panel / inverter / bank entities from free text.
 * Safe to merge with Claude filters (deterministic wins on conflicts for these keys).
 */
export function extractZenithEntityFilters(question: string): ExtractedZenithEntities {
  const qNorm = normalizeText(question);
  if (!qNorm) return {};

  const out: ExtractedZenithEntities = {};

  // Disambiguate brands that exist on both lists (Luminous, Microtek, V-Guard, Tata…).
  const panelCtx = PANEL_HINT.test(qNorm) || /\bpanels?\b/.test(qNorm);
  const inverterCtx = INVERTER_HINT.test(qNorm) || /\binverters?\b/.test(qNorm);

  if (panelCtx || (!inverterCtx && /\b(panel|module)/i.test(question))) {
    const panel = findBrandInQuestion(qNorm, PANEL_BRAND_CANONICAL);
    if (panel) out.panelBrand = panel;
  }
  if (inverterCtx || /\binverter/i.test(question)) {
    const inv = findBrandInQuestion(qNorm, INVERTER_BRAND_CANONICAL);
    if (inv) out.inverterBrand = inv;
  }
  // Brand-only mentions: try inverter first for known inverter-only names, else panel.
  if (!out.panelBrand && !out.inverterBrand) {
    const invOnly = findBrandInQuestion(qNorm, INVERTER_BRAND_CANONICAL);
    const panelOnly = findBrandInQuestion(qNorm, PANEL_BRAND_CANONICAL);
    if (invOnly && !panelOnly) out.inverterBrand = invOnly;
    else if (panelOnly && !invOnly) out.panelBrand = panelOnly;
    else if (invOnly && panelOnly) {
      // Same display name on both — prefer inverter for "Deye"-style, panel when "Solar" in brand.
      if (/solar/i.test(panelOnly)) out.panelBrand = panelOnly;
      else out.inverterBrand = invOnly;
    }
  }

  const bank = findFinancingBank(qNorm);
  if (bank) {
    out.financingBank = bank;
    out.availingLoan = true;
  } else if (LOAN_HINT.test(qNorm) && /\b(avail|availing|using|with|on)\b/.test(qNorm)) {
    out.availingLoan = true;
  }

  if (/\b(how many|number of|count of|count|total projects|projects on)\b/.test(qNorm)) {
    out.wantsCount = true;
  }
  if (/\b(revenue|order value|sales value|total value|₹|rs\.?|inr)\b/.test(qNorm)) {
    out.wantsRevenue = true;
  }

  return out;
}

/** Distinctive contains token for Prisma brand match (handles "Adani" vs "Adani Solar"). */
export function brandContainsToken(canonical: string): string {
  const token = brandMatchToken(canonical);
  // Keep enough specificity; avoid ultra-short tokens.
  return token.length >= 3 ? token : canonical;
}

/** Resolve free-text / Claude filter value → canonical panel brand label. */
export function resolvePanelBrand(raw: string | undefined | null): string | undefined {
  const t = (raw || '').trim();
  if (!t) return undefined;
  const fromList = findBrandInQuestion(normalizeText(t), PANEL_BRAND_CANONICAL);
  if (fromList) return fromList;
  // Already looks like a stored label
  const exact = PANEL_BRAND_CANONICAL.find((b) => b.toLowerCase() === t.toLowerCase());
  return exact || t;
}

/** Resolve free-text / Claude filter value → canonical inverter brand label. */
export function resolveInverterBrand(raw: string | undefined | null): string | undefined {
  const t = (raw || '').trim();
  if (!t) return undefined;
  const fromList = findBrandInQuestion(normalizeText(t), INVERTER_BRAND_CANONICAL);
  if (fromList) return fromList;
  const exact = INVERTER_BRAND_CANONICAL.find((b) => b.toLowerCase() === t.toLowerCase());
  return exact || t;
}

/** Resolve free-text / Claude filter value → financingBank enum key. */
export function findFinancingBankFromRaw(raw: string | undefined | null): string | undefined {
  const t = (raw || '').trim();
  if (!t) return undefined;
  const upper = t.toUpperCase().replace(/\s+/g, '_');
  if (FINANCING_BANK_ALIASES[upper]) return upper;
  return findFinancingBank(normalizeText(t));
}

export function hasEquipmentOrLoanFilters(filters?: {
  panelBrand?: string;
  inverterBrand?: string;
  financingBank?: string;
  availingLoan?: boolean;
}): boolean {
  if (!filters) return false;
  return Boolean(
    filters.panelBrand?.trim() ||
      filters.inverterBrand?.trim() ||
      filters.financingBank?.trim() ||
      filters.availingLoan,
  );
}
