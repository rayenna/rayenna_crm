import type { PreflightFindingId } from './preflight/types';

/** Stable Help section / FAQ anchors used by contextual ? and pre-flight deep-links. */
export const HELP_ANCHORS = {
  quickstart: 'quickstart',
  customers: 'customers',
  costing: 'costing',
  bom: 'bom',
  roi: 'roi',
  aiRoofLayout: 'ai-roof-layout',
  proposal: 'proposal',
  proposalPreflight: 'proposal-preflight',
  tips: 'tips',
  faq: 'faq',
  faqBomEmpty: 'faq-bom-empty',
  faqRoiAutofill: 'faq-roi-autofill',
  faqProposal0Kw: 'faq-proposal-0kw',
  faqPreflightCapacity: 'faq-preflight-capacity',
} as const;

export type HelpAnchor = (typeof HELP_ANCHORS)[keyof typeof HELP_ANCHORS];

const ROUTE_HELP: Array<{ match: (path: string) => boolean; anchor: HelpAnchor; label: string }> = [
  { match: (p) => p === '/' || p === '/customers' || p.startsWith('/customers/'), anchor: HELP_ANCHORS.customers, label: 'Customers' },
  { match: (p) => p === '/dashboard', anchor: HELP_ANCHORS.quickstart, label: 'Quick Start' },
  { match: (p) => p === '/costing', anchor: HELP_ANCHORS.costing, label: 'Costing Sheet' },
  { match: (p) => p === '/bom', anchor: HELP_ANCHORS.bom, label: 'Bill of Materials' },
  { match: (p) => p === '/roi', anchor: HELP_ANCHORS.roi, label: 'ROI Calculator' },
  { match: (p) => p === '/ai-layout', anchor: HELP_ANCHORS.aiRoofLayout, label: 'AI Roof Layout' },
  { match: (p) => p === '/proposal', anchor: HELP_ANCHORS.proposal, label: 'Proposal' },
];

/** Help path for the current app route (e.g. `/help#costing`). */
export function helpPathForRoute(pathname: string): string {
  const path = pathname.split('?')[0] || '/';
  if (path === '/help' || path === '/about' || path === '/login') return '/help';
  for (const row of ROUTE_HELP) {
    if (row.match(path)) return `/help#${row.anchor}`;
  }
  return '/help';
}

/** Short label for Help menu (“Guide: Costing Sheet”). */
export function helpLabelForRoute(pathname: string): string {
  const path = pathname.split('?')[0] || '/';
  for (const row of ROUTE_HELP) {
    if (row.match(path)) return `Guide: ${row.label}`;
  }
  return 'User Guide';
}

const FINDING_HELP: Partial<Record<PreflightFindingId, string>> = {
  missing_costing: `/help#${HELP_ANCHORS.costing}`,
  missing_bom: `/help#${HELP_ANCHORS.faqBomEmpty}`,
  missing_roi: `/help#${HELP_ANCHORS.faqRoiAutofill}`,
  module_wattage_token: `/help#${HELP_ANCHORS.costing}`,
  system_size_zero: `/help#${HELP_ANCHORS.faqProposal0Kw}`,
  system_size_mismatch: `/help#${HELP_ANCHORS.faqPreflightCapacity}`,
  gst_category_default: `/help#${HELP_ANCHORS.costing}`,
  inverter_array_ratio: `/help#${HELP_ANCHORS.bom}`,
  tariff_out_of_band: `/help#${HELP_ANCHORS.roi}`,
  gen_factor_out_of_band: `/help#${HELP_ANCHORS.roi}`,
  subsidy_override_high: `/help#${HELP_ANCHORS.roi}`,
  roof_include_missing: `/help#${HELP_ANCHORS.aiRoofLayout}`,
  roi_not_integer_kw: `/help#${HELP_ANCHORS.roi}`,
};

/** Help deep-link for a pre-flight finding id. */
export function helpPathForPreflightFinding(id: PreflightFindingId): string {
  return FINDING_HELP[id] ?? `/help#${HELP_ANCHORS.proposalPreflight}`;
}

/** Section id from a Help hash (`#costing` → `costing`). */
export function helpAnchorFromHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const id = raw.trim();
  return id || null;
}
