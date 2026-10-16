import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchExactChipIntent } from './chipIntents';

describe('matchExactChipIntent', () => {
  it('matches Management panel mix chip without Claude', () => {
    const intent = matchExactChipIntent('Which panel brands sold most?', UserRole.MANAGEMENT);
    expect(intent?.metric).toBe('panel_brand_mix');
  });

  it('matches Finance bank mix chip', () => {
    const intent = matchExactChipIntent('Which banks are financing loans?', UserRole.FINANCE);
    expect(intent?.metric).toBe('loan_bank_breakdown');
  });

  it('rejects panel mix for Sales', () => {
    expect(matchExactChipIntent('Which panel brands sold most?', UserRole.SALES)).toBeNull();
  });

  it('is case/whitespace insensitive', () => {
    const intent = matchExactChipIntent(
      '  how many customers have sbi loans?  ',
      UserRole.FINANCE,
    );
    expect(intent?.metric).toBe('availing_loan');
    expect(intent?.filters?.financingBank).toBe('SBI');
  });
});
