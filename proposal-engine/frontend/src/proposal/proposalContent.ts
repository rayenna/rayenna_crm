import type { BomRowGenerated, Category } from '../lib/costingConstants';
import { sheetTotalGst } from '../lib/costingConstants';
import { amountInWordsINR } from './amountInWords';
import {
  AUTHORITY_FEE_DEFAULTS,
  KEY_POINTS,
  OFFER_VALIDITY_DAYS,
  PAYMENT_MILESTONES,
  PROPOSAL_EXCLUSIONS,
  RACI_ROWS,
  SUBSIDY_CREDIT_NOTE,
  TECH_DETAILS_FOOTNOTE,
  WARRANTY_SYSTEM_DEFAULT,
  type PaymentMilestone,
  type RaciRow,
} from './proposalCopy';
import { commercialsDescription } from './systemTypeLabel';
import { proposalDisplayCapacityKw } from './proposalAssembly';
import type { ProposalData, TextOverrides } from './types';
import { ov } from './textOverridesApply';

type OverrideMap = TextOverrides | Record<string, string | undefined> | null | undefined;

function omap(map: OverrideMap): TextOverrides | Record<string, string | undefined> | undefined {
  return map ?? undefined;
}

export interface CommercialsWaterfall {
  sizeKw: number;
  description: string;
  preGst: number;
  gstAmount: number;
  gstLabel: string;
  grandRounded: number;
  subsidyAmt: number;
  showSubsidy: boolean;
  /** Total incl. GST — what customer pays Rayenna for the EPC package. */
  payableToRayenna: number;
  /** Payable minus subsidy (when eligible); else same as payable. */
  effectiveAfterSubsidy: number;
  payableInWords: string;
  effectiveInWords: string;
}

export interface AuthorityFeeRow {
  id: string;
  label: string;
  amountLabel: string;
  amount: number | null;
}

export interface TechDetailCard {
  id: string;
  title: string;
  manufacturer: string;
  typeRating: string;
  quantity: string;
  specification: string;
  warranty: string;
}

export interface WarrantyTableRow {
  id: string;
  label: string;
  detail: string;
}

export function buildCommercialsWaterfall(
  p: ProposalData,
  textOverrides?: OverrideMap,
): CommercialsWaterfall | null {
  const grandTotal = p.sheet?.grandTotal ?? p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
  if (!grandTotal) return null;

  const grandRounded = Math.round(grandTotal);
  const subsidyAmt = p.roi?.inputs?.subsidyAmount ?? 0;
  const showSubsidy = !!p.roi?.inputs?.subsidyEligible && subsidyAmt > 0;
  const sizeKw = proposalDisplayCapacityKw(p) || (p.sheet?.systemSizeKw ?? 0);

  let gstAmount: number;
  let preGst: number;
  let gstLabel: string;

  if (p.sheet) {
    const sheetGst =
      p.sheet.totalGst != null && p.sheet.totalGst > 0
        ? p.sheet.totalGst
        : p.sheet.items?.length
          ? sheetTotalGst(p.sheet.items, p.sheet.marginPercent ?? 15)
          : 0;
    gstAmount = Math.round(sheetGst);
    preGst = Math.round(grandRounded - gstAmount);
    gstLabel = 'GST (mixed: 5% & 18%)';
  } else {
    preGst = Math.round(grandRounded / 1.18);
    gstAmount = Math.round(grandRounded - preGst);
    gstLabel = 'GST @ 18% (estimate)';
  }

  const payableToRayenna = grandRounded;
  const effectiveAfterSubsidy = showSubsidy
    ? Math.max(0, Math.round(grandRounded - subsidyAmt))
    : grandRounded;

  const description = ov(
    omap(textOverrides),
    'commercials-desc',
    commercialsDescription(sizeKw, p.systemType),
  );

  return {
    sizeKw,
    description,
    preGst,
    gstAmount,
    gstLabel,
    grandRounded,
    subsidyAmt,
    showSubsidy,
    payableToRayenna,
    effectiveAfterSubsidy,
    payableInWords: amountInWordsINR(payableToRayenna),
    effectiveInWords: amountInWordsINR(effectiveAfterSubsidy),
  };
}

export function seedAuthorityFees(systemSizeKw: number): AuthorityFeeRow[] {
  const kw = systemSizeKw > 0 ? Math.round(systemSizeKw) : 0;
  const registration =
    kw > 0 ? kw * AUTHORITY_FEE_DEFAULTS.registrationPerKw : AUTHORITY_FEE_DEFAULTS.registrationFallback;
  return [
    {
      id: 'feasibility',
      label: 'DISCOM Feasibility',
      amountLabel: `₹ ${AUTHORITY_FEE_DEFAULTS.feasibility.toLocaleString('en-IN')}`,
      amount: AUTHORITY_FEE_DEFAULTS.feasibility,
    },
    {
      id: 'registration',
      label: 'DISCOM Registration',
      amountLabel:
        kw > 0
          ? `₹ ${registration.toLocaleString('en-IN')} (${kw} kW × ₹${AUTHORITY_FEE_DEFAULTS.registrationPerKw}/kW) + 18% GST`
          : `As applicable + 18% GST`,
      amount: kw > 0 ? registration : null,
    },
    {
      id: 'other',
      label: 'Other DISCOM fees',
      amountLabel: '— N/A —',
      amount: null,
    },
    {
      id: 'reimbursement',
      label: 'DISCOM reimbursement (if any)',
      amountLabel: '— N/A —',
      amount: null,
    },
  ];
}

export function resolveAuthorityFees(
  systemSizeKw: number,
  textOverrides?: OverrideMap,
): AuthorityFeeRow[] {
  const seeded = seedAuthorityFees(systemSizeKw);
  const map = omap(textOverrides);
  return seeded.map((row) => {
    const label = ov(map, `authority-fee-${row.id}-label`, row.label);
    const amountLabel = ov(map, `authority-fee-${row.id}-amount`, row.amountLabel);
    return { ...row, label, amountLabel };
  });
}

export function resolvePaymentMilestones(
  textOverrides?: OverrideMap,
): PaymentMilestone[] {
  const map = omap(textOverrides);
  return PAYMENT_MILESTONES.map((m, i) => ({
    percent: Number(ov(map, `payment-milestone-${i}-percent`, String(m.percent))) || m.percent,
    trigger: ov(map, `payment-milestone-${i}-trigger`, m.trigger),
  }));
}

function categoryRows(bom: BomRowGenerated[], cat: Category): BomRowGenerated[] {
  return bom.filter((r) => r.category === cat);
}

function joinUnique(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out.join(' · ') || '—';
}

function qtySummary(rows: BomRowGenerated[]): string {
  if (!rows.length) return '—';
  return rows
    .map((r) => {
      const q = (r.quantity || '').trim();
      const name = (r.itemName || '').trim();
      if (q && name) return `${q} (${name})`;
      return q || name || '—';
    })
    .join('; ');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalize `ADANI / EMMVEE / WAAREE` → `ADANI/EMMVEE/WAAREE`. */
export function normalizeSlashBrandCluster(raw: string): string {
  return raw
    .split('/')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('/');
}

/**
 * Pull manufacturer slash-lists from BOQ notes / specs, e.g.
 * `ADANI/EMMVEE/WAAREE`, `(DEYE/POLYCAB/SOLAIRE)`, `MAKE:DEYE/GROWATT`.
 */
export function extractSlashManufacturerCluster(text: string): string | null {
  const src = (text || '').trim();
  if (!src) return null;

  const makeMatch = src.match(
    /\bMAKE\s*:\s*([A-Za-z][A-Za-z0-9.+-]*(?:\s*\/\s*[A-Za-z][A-Za-z0-9.+-]*)*)/i,
  );
  if (makeMatch?.[1]) {
    const cluster = normalizeSlashBrandCluster(makeMatch[1]);
    if (cluster) return cluster;
  }

  const paren = src.match(
    /\(\s*([A-Za-z][A-Za-z0-9.+-]*(?:\s*\/\s*[A-Za-z][A-Za-z0-9.+-]*)+)\s*\)/,
  );
  if (paren?.[1]) {
    const cluster = normalizeSlashBrandCluster(paren[1]);
    if (cluster) return cluster;
  }

  const bare = src.match(
    /\b([A-Za-z][A-Za-z0-9.+-]{1,}(?:\s*\/\s*[A-Za-z][A-Za-z0-9.+-]{1,}){1,})\b/,
  );
  if (bare?.[1]) {
    return normalizeSlashBrandCluster(bare[1]);
  }

  return null;
}

/** Split a BOQ note into manufacturer (slash brand list) + remaining specification text. */
export function parseNoteManufacturerAndSpec(note: string): {
  manufacturer: string | null;
  specification: string;
} {
  const trimmed = (note || '').trim();
  if (!trimmed) return { manufacturer: null, specification: '' };

  const manufacturer = extractSlashManufacturerCluster(trimmed);
  if (!manufacturer) return { manufacturer: null, specification: trimmed };

  const parts = manufacturer.split('/').map(escapeRegExp);
  const clusterRe = parts.join('\\s*\\/\\s*');
  let specification = trimmed;
  specification = specification.replace(new RegExp(`\\bMAKE\\s*:\\s*${clusterRe}`, 'gi'), ' ');
  specification = specification.replace(new RegExp(`\\(\\s*${clusterRe}\\s*\\)`, 'gi'), ' ');
  specification = specification.replace(new RegExp(clusterRe, 'gi'), ' ');
  specification = specification
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([,;])\s*/g, '$1 ')
    .replace(/^[\s\-–:|/]+|[\s\-–:|/]+$/g, '')
    .trim();

  return { manufacturer, specification };
}

function categoryNote(
  bomComments: Record<string, string> | null | undefined,
  cat: Category,
): string {
  return (bomComments?.[cat] ?? '').trim();
}

/**
 * Prefer BOQ category notes for manufacturer (slash list) + specification (remainder).
 * Fall back to BOM row specifications, then CRM/row brand fields.
 */
function manufacturerAndSpecFromNotesAndRows(
  note: string,
  rows: BomRowGenerated[],
  brandFallback: string[],
): { manufacturer: string; specification: string } {
  if (note) {
    const fromNote = parseNoteManufacturerAndSpec(note);
    if (fromNote.manufacturer) {
      return {
        manufacturer: fromNote.manufacturer,
        specification: fromNote.specification || joinUnique(rows.map((r) => r.specification)),
      };
    }
  }

  for (const row of rows) {
    const fromSpec = parseNoteManufacturerAndSpec(row.specification || '');
    if (fromSpec.manufacturer) {
      const cleanedSpecs = rows.map((r) => {
        const p = parseNoteManufacturerAndSpec(r.specification || '');
        return p.manufacturer ? p.specification : (r.specification || '').trim();
      });
      return {
        manufacturer: fromSpec.manufacturer,
        specification:
          (note && !extractSlashManufacturerCluster(note) ? note : '') ||
          joinUnique(cleanedSpecs.filter(Boolean)) ||
          '—',
      };
    }
  }

  return {
    manufacturer: joinUnique(brandFallback),
    specification: note || joinUnique(rows.map((r) => r.specification)),
  };
}

export function buildTechDetailCards(
  p: ProposalData,
  textOverrides?: OverrideMap,
  bomComments?: Record<string, string> | null,
): TechDetailCard[] {
  const bom = p.bom ?? [];
  const panelBrand = (p.panelBrand ?? '').trim();
  const inverterBrand = (p.inverterBrand ?? '').trim();

  const modules = categoryRows(bom, 'pv-modules');
  const inverters = categoryRows(bom, 'inverters');
  const mounting = categoryRows(bom, 'mounting-structure');
  const acdb = categoryRows(bom, 'ac-db');
  const dcdb = categoryRows(bom, 'dc-db');

  const moduleNote = categoryNote(bomComments, 'pv-modules');
  const inverterNote = categoryNote(bomComments, 'inverters');

  const cards: TechDetailCard[] = [];

  if (modules.length || panelBrand || moduleNote) {
    const { manufacturer, specification } = manufacturerAndSpecFromNotesAndRows(
      moduleNote,
      modules,
      [panelBrand, ...modules.map((r) => r.brand ?? '')],
    );
    cards.push({
      id: 'modules',
      title: 'Solar PV Modules',
      manufacturer,
      typeRating: joinUnique(modules.map((r) => r.itemName)),
      quantity: qtySummary(modules),
      specification,
      warranty: '12 years product warranty and 30 years linear power warranty',
    });
  }

  if (inverters.length || inverterBrand || inverterNote) {
    const { manufacturer, specification } = manufacturerAndSpecFromNotesAndRows(
      inverterNote,
      inverters,
      [inverterBrand, ...inverters.map((r) => r.brand ?? '')],
    );
    cards.push({
      id: 'inverter',
      title: 'Inverter',
      manufacturer,
      typeRating: joinUnique(inverters.map((r) => r.itemName)),
      quantity: qtySummary(inverters),
      specification,
      warranty: 'As per manufacturer (typically 8–10 years product warranty)',
    });
  }

  if (mounting.length) {
    cards.push({
      id: 'mounting',
      title: 'Mounting Structure',
      manufacturer: joinUnique(mounting.map((r) => r.brand)),
      typeRating: joinUnique(mounting.map((r) => r.itemName)),
      quantity: qtySummary(mounting),
      specification: joinUnique(mounting.map((r) => r.specification)),
      warranty: 'As per manufacturer',
    });
  }

  if (acdb.length) {
    cards.push({
      id: 'acdb',
      title: 'AC Distribution Board',
      manufacturer: joinUnique(acdb.map((r) => r.brand)),
      typeRating: joinUnique(acdb.map((r) => r.itemName)),
      quantity: qtySummary(acdb),
      specification: joinUnique(acdb.map((r) => r.specification)),
      warranty: 'As per manufacturer',
    });
  }

  if (dcdb.length) {
    cards.push({
      id: 'dcdb',
      title: 'DC Distribution Board',
      manufacturer: joinUnique(dcdb.map((r) => r.brand)),
      typeRating: joinUnique(dcdb.map((r) => r.itemName)),
      quantity: qtySummary(dcdb),
      specification: joinUnique(dcdb.map((r) => r.specification)),
      warranty: 'As per manufacturer',
    });
  }

  const map = omap(textOverrides);
  return cards.map((c) => ({
    ...c,
    manufacturer: ov(map, `tech-${c.id}-manufacturer`, c.manufacturer),
    typeRating: ov(map, `tech-${c.id}-type`, c.typeRating),
    quantity: ov(map, `tech-${c.id}-qty`, c.quantity),
    specification: ov(map, `tech-${c.id}-spec`, c.specification),
    warranty: ov(map, `tech-${c.id}-warranty`, c.warranty),
  }));
}

export function techDetailsFootnote(textOverrides?: OverrideMap): string {
  return ov(omap(textOverrides), 'tech-details-footnote', TECH_DETAILS_FOOTNOTE);
}

export function buildWarrantyRows(
  p: ProposalData,
  textOverrides?: OverrideMap,
  bomComments?: Record<string, string> | null,
): WarrantyTableRow[] {
  const tech = buildTechDetailCards(p, null, bomComments);
  const moduleCard = tech.find((c) => c.id === 'modules');
  const inverterCard = tech.find((c) => c.id === 'inverter');

  const moduleDetail = moduleCard
    ? `${moduleCard.manufacturer !== '—' ? `${moduleCard.manufacturer}: ` : ''}${moduleCard.warranty}`
    : '12 Year product warranty and 30 year performance warranty for PV modules.';

  const inverterDetail = inverterCard
    ? `${inverterCard.manufacturer !== '—' ? `${inverterCard.manufacturer}: ` : ''}${inverterCard.warranty}`
    : '10 Years warranty for Inverter.';

  const rows: WarrantyTableRow[] = [
    {
      id: 'system',
      label: 'Rayenna system warranty',
      detail: WARRANTY_SYSTEM_DEFAULT,
    },
    {
      id: 'modules',
      label: 'PV Modules warranty',
      detail: moduleDetail,
    },
    {
      id: 'inverter',
      label: 'Inverter warranty',
      detail: inverterDetail,
    },
  ];

  const map = omap(textOverrides);
  return rows.map((r) => ({
    ...r,
    label: ov(map, `warranty-row-${r.id}-label`, r.label),
    detail: ov(map, `warranty-row-${r.id}-detail`, r.detail),
  }));
}

const RACI_MAX_ROWS = 40;

export function resolveRaciRows(textOverrides?: OverrideMap): RaciRow[] {
  const map = omap(textOverrides);
  const countRaw = map?.['raci-count'];
  let count = RACI_ROWS.length;
  if (countRaw != null && String(countRaw).trim() !== '') {
    const n = Number.parseInt(String(countRaw).trim(), 10);
    if (Number.isFinite(n) && n >= 0) count = Math.min(n, RACI_MAX_ROWS);
  }

  const rows: RaciRow[] = [];
  for (let i = 0; i < count; i++) {
    const def = RACI_ROWS[i];
    rows.push({
      description: ov(map, `raci-${i}-desc`, def?.description ?? ''),
      rayenna: ov(map, `raci-${i}-rayenna`, def ? (def.rayenna ? 'yes' : 'no') : 'yes') !== 'no',
      client: ov(map, `raci-${i}-client`, def ? (def.client ? 'yes' : 'no') : 'no') !== 'no',
    });
  }
  return rows;
}

export function resolveExclusions(textOverrides?: OverrideMap): string[] {
  const raw = omap(textOverrides)?.['list-exclusions'];
  if (raw != null && raw.trim() !== '') {
    return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return [...PROPOSAL_EXCLUSIONS];
}

export function resolveKeyPoints(textOverrides?: OverrideMap): string[] {
  const raw = omap(textOverrides)?.['list-key-points'];
  if (raw != null && raw.trim() !== '') {
    return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return [...KEY_POINTS];
}

export function resolveOfferValidity(textOverrides?: OverrideMap): string {
  return ov(
    omap(textOverrides),
    'offer-validity',
    `The offer is valid for ${OFFER_VALIDITY_DAYS} days from the date of proposal. Prices are subject to change based on market conditions and GST revisions.`,
  );
}

export function subsidyCreditNote(textOverrides?: OverrideMap): string {
  return ov(omap(textOverrides), 'subsidy-credit-note', SUBSIDY_CREDIT_NOTE);
}

/** Legacy commercialsFromProposal shape used by PPT — extended for waterfall. */
export function commercialsFromProposal(p: ProposalData): CommercialsWaterfall | null {
  return buildCommercialsWaterfall(p, null);
}
