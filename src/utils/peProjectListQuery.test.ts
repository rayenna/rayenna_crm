import { describe, expect, it } from 'vitest';
import { ProjectStatus, UserRole } from '@prisma/client';
import { buildPeSelectedWhere, parseStagesFromQuery } from './peProjectListQuery';

describe('parseStagesFromQuery', () => {
  it('splits comma-separated stage tokens', () => {
    expect(parseStagesFromQuery('PROPOSAL,COMPLETED,LOST')).toEqual([
      'PROPOSAL',
      'COMPLETED',
      'LOST',
    ]);
  });
});

describe('buildPeSelectedWhere', () => {
  it('maps COMPLETED filter to both completed statuses', () => {
    const where = buildPeSelectedWhere(UserRole.ADMIN, 'u1', {
      stages: ['COMPLETED'],
    });

    expect(where).toEqual({
      project: {
        AND: [
          {
            projectStatus: {
              in: [
                ProjectStatus.COMPLETED,
                ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
              ],
            },
          },
        ],
      },
    });
  });

  it('keeps LOST filter available as a selectable stage', () => {
    const where = buildPeSelectedWhere(UserRole.ADMIN, 'u1', {
      stages: ['LOST'],
    });

    expect(where).toEqual({
      project: {
        AND: [{ projectStatus: ProjectStatus.LOST }],
      },
    });
  });
});
