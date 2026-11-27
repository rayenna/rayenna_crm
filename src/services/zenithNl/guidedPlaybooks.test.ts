import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchGuidedPlaybookIntent, playbookAsksForRole } from './guidedPlaybooks';

describe('guided playbooks', () => {
  it('lists role playbooks', () => {
    const sales = playbookAsksForRole(UserRole.SALES);
    expect(sales).toContain('Chase unpaid under-install');
    expect(sales).toContain('Unstick stalled pipeline');
  });

  it('matches chase unpaid under-install chip', () => {
    const intent = matchGuidedPlaybookIntent('Chase unpaid under-install', UserRole.SALES);
    expect(intent?.metric).toBe('guided_playbook');
    expect(intent?.filters?.detailSlice).toBe('chase_unpaid_under_install');
  });

  it('matches soft paraphrase', () => {
    expect(
      matchGuidedPlaybookIntent('chase unpaid under installation list', UserRole.FINANCE)
        ?.filters?.detailSlice,
    ).toBe('chase_unpaid_under_install');
  });

  it('rejects finance-only stalled playbook for ops? — ops has unpaid + subsidy + tickets', () => {
    const ops = playbookAsksForRole(UserRole.OPERATIONS);
    expect(ops).toContain('Chase unpaid under-install');
    expect(ops).not.toContain('Unstick stalled pipeline');
  });
});
