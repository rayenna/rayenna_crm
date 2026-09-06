import { describe, expect, it } from 'vitest';
import { extractHubReferralCandidates } from './consumerReferral';

describe('extractHubReferralCandidates', () => {
  it('reads a bare Hub code', () => {
    expect(extractHubReferralCandidates('ANILK4821')).toEqual(['ANILK4821']);
  });

  it('reads a code next to a person name', () => {
    expect(extractHubReferralCandidates('Ravi Kumar ANILK4821')).toEqual(['ANILK4821']);
  });

  it('ignores ordinary names', () => {
    expect(extractHubReferralCandidates('Jane Doe')).toEqual([]);
  });
});
