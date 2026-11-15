/**
 * Optional proposal sections (user M/O matrix).
 * Mandatory sections are always rendered. AI Roof Layout and custom sections
 * keep their existing include/add UX and are intentionally not in this catalog.
 */

export const OPTIONAL_PROPOSAL_SECTION_IDS = [
  'environmental-impact',
  'our-process',
  'responsibility-matrix',
  'technical-details',
  'warranty',
  'offer-validity',
  'service-details',
  'key-points',
  'exclusions',
  'subsidy-disclaimer',
] as const;

export type OptionalProposalSectionId = (typeof OPTIONAL_PROPOSAL_SECTION_IDS)[number];

export type IncludedOptionalSections = Partial<Record<OptionalProposalSectionId, boolean>>;

export interface OptionalProposalSectionMeta {
  id: OptionalProposalSectionId;
  label: string;
}

/** UI order matches the live proposal document. */
export const OPTIONAL_PROPOSAL_SECTIONS: OptionalProposalSectionMeta[] = [
  { id: 'environmental-impact', label: 'Environmental Impact' },
  { id: 'our-process', label: 'Our Process' },
  { id: 'responsibility-matrix', label: 'Responsibility Matrix' },
  { id: 'technical-details', label: 'Technical Details' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'offer-validity', label: 'Offer Validity' },
  { id: 'service-details', label: 'Service Details' },
  { id: 'key-points', label: 'Key Points' },
  { id: 'exclusions', label: 'Exclusions' },
  { id: 'subsidy-disclaimer', label: 'Subsidy Disclaimer and Payment Terms' },
];

/** Existing proposals keep every optional section until the user excludes one. */
export function defaultIncludedOptionalSections(): Record<OptionalProposalSectionId, boolean> {
  return Object.fromEntries(
    OPTIONAL_PROPOSAL_SECTION_IDS.map((id) => [id, true]),
  ) as Record<OptionalProposalSectionId, boolean>;
}

export function normalizeIncludedOptionalSections(
  raw?: IncludedOptionalSections | Record<string, boolean> | null,
): Record<OptionalProposalSectionId, boolean> {
  const base = defaultIncludedOptionalSections();
  if (!raw || typeof raw !== 'object') return base;
  for (const id of OPTIONAL_PROPOSAL_SECTION_IDS) {
    if (Object.prototype.hasOwnProperty.call(raw, id)) {
      base[id] = !!(raw as Record<string, boolean>)[id];
    }
  }
  return base;
}

export function isOptionalSectionIncluded(
  id: OptionalProposalSectionId,
  map?: IncludedOptionalSections | Record<string, boolean> | null,
): boolean {
  if (map && Object.prototype.hasOwnProperty.call(map, id)) {
    return !!(map as Record<string, boolean>)[id];
  }
  return true;
}
