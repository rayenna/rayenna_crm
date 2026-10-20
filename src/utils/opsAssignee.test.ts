import { describe, expect, it } from 'vitest';
import { ProjectStatus, UserRole } from '@prisma/client';
import {
  canChooseOpsAssignee,
  isConfirmedOrBeyond,
  resolveAssignedOpsId,
} from './opsAssignee';

const opsA = { id: 'ops-a' };
const opsB = { id: 'ops-b' };

describe('opsAssignee', () => {
  it('detects Confirmed or beyond', () => {
    expect(isConfirmedOrBeyond(ProjectStatus.CONFIRMED)).toBe(true);
    expect(isConfirmedOrBeyond(ProjectStatus.UNDER_INSTALLATION)).toBe(true);
    expect(isConfirmedOrBeyond(ProjectStatus.LEAD)).toBe(false);
    expect(isConfirmedOrBeyond(ProjectStatus.LOST)).toBe(false);
  });

  it('only Admin and Sales may choose Ops', () => {
    expect(canChooseOpsAssignee(UserRole.ADMIN)).toBe(true);
    expect(canChooseOpsAssignee(UserRole.SALES)).toBe(true);
    expect(canChooseOpsAssignee(UserRole.MANAGEMENT)).toBe(false);
    expect(canChooseOpsAssignee(UserRole.OPERATIONS)).toBe(false);
  });

  it('keeps current assignee when status is not Confirmed+', () => {
    expect(
      resolveAssignedOpsId({
        finalStatus: ProjectStatus.LEAD,
        currentOpsId: 'ops-a',
        requestedOpsId: 'ops-b',
        canChooseOps: true,
        opsUsers: [opsA, opsB],
      }),
    ).toBe('ops-a');
  });

  it('forces sole Ops user on Confirmed+', () => {
    expect(
      resolveAssignedOpsId({
        finalStatus: ProjectStatus.CONFIRMED,
        currentOpsId: null,
        requestedOpsId: null,
        canChooseOps: true,
        opsUsers: [opsA],
      }),
    ).toBe('ops-a');
  });

  it('Admin/Sales can pick among multiple Ops users', () => {
    expect(
      resolveAssignedOpsId({
        finalStatus: ProjectStatus.UNDER_INSTALLATION,
        currentOpsId: null,
        requestedOpsId: 'ops-b',
        canChooseOps: true,
        opsUsers: [opsA, opsB],
      }),
    ).toBe('ops-b');
  });

  it('non-choosers keep existing valid assignee when multi-ops', () => {
    expect(
      resolveAssignedOpsId({
        finalStatus: ProjectStatus.CONFIRMED,
        currentOpsId: 'ops-a',
        requestedOpsId: 'ops-b',
        canChooseOps: false,
        opsUsers: [opsA, opsB],
      }),
    ).toBe('ops-a');
  });

  it('leaves null when multi-ops and nothing valid', () => {
    expect(
      resolveAssignedOpsId({
        finalStatus: ProjectStatus.CONFIRMED,
        currentOpsId: null,
        requestedOpsId: null,
        canChooseOps: true,
        opsUsers: [opsA, opsB],
      }),
    ).toBeNull();
  });
});
