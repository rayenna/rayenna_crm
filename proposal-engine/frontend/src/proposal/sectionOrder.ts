/**
 * Reorderable proposal body sections (everything after Cover + Executive Summary).
 * Cover and Executive Summary are fixed at the top and never appear in this list.
 */

export const REORDERABLE_SECTION_IDS = [
  'about-rayenna',
  'what-we-offer',
  'financial-benefits',
  'environmental-impact',
  'roof-layout',
  'our-process',
  'scope-of-work',
  'responsibility-matrix',
  'custom-sections',
  'technical-details',
  'bom',
  'commercials',
  'payment-milestones',
  'account-details',
  'warranty',
  'delivery-terms',
  'offer-validity',
  'terms-and-conditions',
  'service-details',
  'key-points',
  'exclusions',
  'closing-note',
  'subsidy-disclaimer',
] as const;

export type ReorderableSectionId = (typeof REORDERABLE_SECTION_IDS)[number];

export type SectionOrder = ReorderableSectionId[];

export interface ReorderableSectionMeta {
  id: ReorderableSectionId;
  label: string;
  /** When set, section is gated by includedOptionalSections. */
  optionalId?: string;
}

/** Default order matches the current live proposal document. */
export const REORDERABLE_SECTIONS: ReorderableSectionMeta[] = [
  { id: 'about-rayenna', label: 'About Rayenna Energy' },
  { id: 'what-we-offer', label: 'What We Offer' },
  { id: 'financial-benefits', label: 'Financial Benefits & Savings' },
  { id: 'environmental-impact', label: 'Environmental Impact', optionalId: 'environmental-impact' },
  { id: 'roof-layout', label: 'Proposed Rooftop Solar Layout' },
  { id: 'our-process', label: 'Our Process', optionalId: 'our-process' },
  { id: 'scope-of-work', label: 'Scope of Work' },
  { id: 'responsibility-matrix', label: 'Responsibility Matrix', optionalId: 'responsibility-matrix' },
  { id: 'custom-sections', label: 'Custom sections' },
  { id: 'technical-details', label: 'Technical Details', optionalId: 'technical-details' },
  { id: 'bom', label: 'Bill of Quantities' },
  { id: 'commercials', label: 'Commercials' },
  { id: 'payment-milestones', label: 'Payment Terms' },
  { id: 'account-details', label: 'Account Details' },
  { id: 'warranty', label: 'Warranty', optionalId: 'warranty' },
  { id: 'delivery-terms', label: 'Material Delivery Period' },
  { id: 'offer-validity', label: 'Offer Validity', optionalId: 'offer-validity' },
  { id: 'terms-and-conditions', label: 'Terms & Conditions' },
  { id: 'service-details', label: 'Service Details', optionalId: 'service-details' },
  { id: 'key-points', label: 'Key Points', optionalId: 'key-points' },
  { id: 'exclusions', label: 'Exclusions', optionalId: 'exclusions' },
  { id: 'closing-note', label: 'Closing Note' },
  { id: 'subsidy-disclaimer', label: 'Subsidy Disclaimer and Payment Terms', optionalId: 'subsidy-disclaimer' },
];

const KNOWN = new Set<string>(REORDERABLE_SECTION_IDS);

export function defaultSectionOrder(): SectionOrder {
  return [...REORDERABLE_SECTION_IDS];
}

/**
 * Keep known ids in the user's relative order, append any new catalog ids
 * that were missing (in default relative position among remaining), drop unknowns.
 */
export function normalizeSectionOrder(raw?: string[] | null): SectionOrder {
  const defaults = defaultSectionOrder();
  if (!Array.isArray(raw) || raw.length === 0) return defaults;

  const seen = new Set<string>();
  const ordered: ReorderableSectionId[] = [];
  for (const id of raw) {
    if (typeof id !== 'string' || !KNOWN.has(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id as ReorderableSectionId);
  }

  // Append missing ids in default catalog order.
  for (const id of defaults) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

export function moveSection(
  order: SectionOrder,
  id: ReorderableSectionId,
  direction: 'up' | 'down',
): SectionOrder {
  const normalized = normalizeSectionOrder(order);
  const idx = normalized.indexOf(id);
  if (idx < 0) return normalized;
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= normalized.length) return normalized;
  const next = [...normalized];
  [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
  return next;
}

export function sectionLabel(id: ReorderableSectionId): string {
  return REORDERABLE_SECTIONS.find((s) => s.id === id)?.label ?? id;
}
