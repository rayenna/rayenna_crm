import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchAskEditActionIntent } from './askEditActions';

describe('matchAskEditActionIntent', () => {
  it('matches update payment without DB when no SL (opens projects)', async () => {
    const m = await matchAskEditActionIntent('Update payment', UserRole.FINANCE);
    expect(m?.action).toBe('edit_project_payment');
    expect(m?.href).toBe('/projects');
  });

  it('matches change status / assign ops / add remark patterns', async () => {
    expect((await matchAskEditActionIntent('Change status of SL 99999', UserRole.ADMIN))?.action).toBe(
      'edit_project_status',
    );
    expect((await matchAskEditActionIntent('Assign ops to SL 99999', UserRole.OPERATIONS))?.action).toBe(
      'assign_project_ops',
    );
    expect((await matchAskEditActionIntent('Add remark to SL 99999', UserRole.SALES))?.action).toBe(
      'add_project_remark',
    );
  });

  it('does not steal analytics status questions', async () => {
    expect(await matchAskEditActionIntent("What's the status of SL 1?", UserRole.ADMIN)).toBeNull();
    expect(await matchAskEditActionIntent('Payment timeline', UserRole.FINANCE)).toBeNull();
  });

  it('rejects Finance for assign ops', async () => {
    expect(await matchAskEditActionIntent('Assign ops to SL 1', UserRole.FINANCE)).toBeNull();
  });
});
