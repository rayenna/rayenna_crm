import { describe, expect, it } from 'vitest';
import { LeadSource } from '@prisma/client';
import {
  leadSourceRequiresDetails,
  normalizeLeadSourceDetailsForStorage,
  validateLeadSourceDetailsPair,
} from './leadSourceValidation';

describe('leadSourceValidation', () => {
  it('requires details for referral, channel partner, and other', () => {
    expect(leadSourceRequiresDetails(LeadSource.REFERRAL)).toBe(true);
    expect(leadSourceRequiresDetails(LeadSource.CHANNEL_PARTNER)).toBe(true);
    expect(leadSourceRequiresDetails(LeadSource.OTHER)).toBe(true);
    expect(leadSourceRequiresDetails(LeadSource.WEBSITE)).toBe(false);
  });

  it('rejects empty details when source requires them', () => {
    expect(validateLeadSourceDetailsPair(LeadSource.REFERRAL, '  ')).toEqual({
      ok: false,
      error: 'Referral Name is required when Lead Source is Referral',
    });
  });

  it('accepts trimmed details and clears for other sources', () => {
    expect(validateLeadSourceDetailsPair(LeadSource.REFERRAL, ' Jane Doe ')).toEqual({ ok: true });
    expect(normalizeLeadSourceDetailsForStorage(LeadSource.REFERRAL, ' Jane ')).toBe('Jane');
    expect(normalizeLeadSourceDetailsForStorage(LeadSource.WEBSITE, 'ignored')).toBe(null);
  });
});
