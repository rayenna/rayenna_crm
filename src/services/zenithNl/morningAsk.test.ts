import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchMorningBriefIntent } from './morningAsk';
import { matchSubsidyChaseIntent } from './subsidyChaseAsk';

describe('matchMorningBriefIntent', () => {
  it('matches My morning Ask for Sales', () => {
    const intent = matchMorningBriefIntent('My morning Ask', UserRole.SALES);
    expect(intent?.metric).toBe('morning_brief');
  });

  it('matches start my day', () => {
    expect(matchMorningBriefIntent('Start my day', UserRole.OPERATIONS)?.metric).toBe(
      'morning_brief',
    );
  });

  it('rejects unrelated', () => {
    expect(matchMorningBriefIntent('Who should I call today?', UserRole.SALES)).toBeNull();
  });

  it('rejects Help/FAQ wording that mentions Morning Ask', () => {
    expect(
      matchMorningBriefIntent(
        'What are Ask playbooks and Morning Ask?',
        UserRole.ADMIN,
      ),
    ).toBeNull();
  });
});

describe('matchSubsidyChaseIntent', () => {
  it('matches Subsidy chase pack', () => {
    expect(matchSubsidyChaseIntent('Subsidy chase pack', UserRole.OPERATIONS)?.metric).toBe(
      'subsidy_chase_pack',
    );
  });

  it('matches pending subsidy with docs', () => {
    expect(
      matchSubsidyChaseIntent('Pending subsidy with missing docs', UserRole.ADMIN)?.metric,
    ).toBe('subsidy_chase_pack');
  });
});
