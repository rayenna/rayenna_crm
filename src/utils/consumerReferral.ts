/** Hub referral codes are 5 letters + 4 digits (see generateReferralCode). */
export const HUB_REFERRAL_CODE_RE = /\b([A-Za-z]{5}\d{4})\b/g;

export function extractHubReferralCandidates(details: string | null | undefined): string[] {
  const raw = (details ?? '').toString().trim();
  if (!raw) return [];

  const found = new Set<string>();
  const compact = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (/^[A-Z]{5}\d{4}$/.test(compact)) {
    found.add(compact);
  }

  for (const match of raw.matchAll(HUB_REFERRAL_CODE_RE)) {
    found.add(match[1].toUpperCase());
  }

  return [...found];
}
