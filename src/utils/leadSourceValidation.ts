import { LeadSource } from '@prisma/client';

const LEAD_SOURCES_REQUIRING_DETAILS = new Set<LeadSource>([
  LeadSource.REFERRAL,
  LeadSource.CHANNEL_PARTNER,
  LeadSource.OTHER,
]);

export function leadSourceRequiresDetails(leadSource: string | null | undefined): boolean {
  if (!leadSource) return false;
  return LEAD_SOURCES_REQUIRING_DETAILS.has(leadSource as LeadSource);
}

export function getLeadSourceDetailsRequiredError(leadSource: LeadSource): string {
  switch (leadSource) {
    case LeadSource.REFERRAL:
      return 'Referral Name is required when Lead Source is Referral';
    case LeadSource.CHANNEL_PARTNER:
      return 'Channel Partner Name is required when Lead Source is Channel Partner';
    case LeadSource.OTHER:
      return 'Other Details are required when Lead Source is Other';
    default:
      return 'Lead source details are required';
  }
}

export function validateLeadSourceDetailsPair(
  leadSource: string | null | undefined,
  leadSourceDetails: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!leadSourceRequiresDetails(leadSource)) {
    return { ok: true };
  }
  const trimmed = (leadSourceDetails ?? '').toString().trim();
  if (!trimmed) {
    return {
      ok: false,
      error: getLeadSourceDetailsRequiredError(leadSource as LeadSource),
    };
  }
  return { ok: true };
}

export function normalizeLeadSourceDetailsForStorage(
  leadSource: string | null | undefined,
  leadSourceDetails: string | null | undefined,
): string | null {
  if (!leadSourceRequiresDetails(leadSource)) return null;
  const trimmed = (leadSourceDetails ?? '').toString().trim();
  return trimmed || null;
}
