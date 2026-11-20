import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchLatestPaymentsIntent, parseLatestPaymentsLimit } from './latestPaymentsAsk';
import { matchExactChipIntent } from './chipIntents';

describe('latestPaymentsAsk', () => {
  it('parses last N / word limits', () => {
    expect(parseLatestPaymentsLimit('list the last five payments received')).toBe(5);
    expect(parseLatestPaymentsLimit('show the latest 10 payments')).toBe(10);
    expect(parseLatestPaymentsLimit('recent payments received')).toBe(5);
  });

  it('matches Payment Radar style questions', () => {
    const intent = matchLatestPaymentsIntent(
      'list the last five payments received',
      UserRole.FINANCE,
    );
    expect(intent?.metric).toBe('latest_payments_received');
    expect(intent?.filters?.detailSlice).toBe('5');
  });

  it('is available via exact chip matcher', () => {
    const intent = matchExactChipIntent(
      'list the last five payments received',
      UserRole.MANAGEMENT,
    );
    expect(intent?.metric).toBe('latest_payments_received');
  });

  it('does not steal unpaid / outstanding asks', () => {
    expect(
      matchLatestPaymentsIntent('list unpaid payments', UserRole.FINANCE),
    ).toBeNull();
    expect(
      matchLatestPaymentsIntent('outstanding payments overdue', UserRole.ADMIN),
    ).toBeNull();
  });
});
