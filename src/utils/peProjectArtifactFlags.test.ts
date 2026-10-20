import { describe, expect, it } from 'vitest';
import { ProjectStatus } from '@prisma/client';
import {
  tallyPeProjectStats,
  type PeArtifactFlagSets,
} from './peProjectArtifactFlags';

function emptySets(): PeArtifactFlagSets {
  return {
    hasCosting: new Set(),
    hasBom: new Set(),
    hasRoi: new Set(),
    hasProposal: new Set(),
    hasRoofLayout: new Set(),
  };
}

describe('tallyPeProjectStats', () => {
  it('counts not-started, draft, ready, and confirmed in one pass', () => {
    const sets: PeArtifactFlagSets = {
      ...emptySets(),
      hasCosting: new Set(['draft-1', 'ready-1']),
      hasBom: new Set(['ready-1']),
      hasRoi: new Set(['ready-1']),
      hasProposal: new Set(['ready-1']),
    };

    expect(
      tallyPeProjectStats(
        [
          { projectId: 'none-1', projectStatus: ProjectStatus.PROPOSAL },
          { projectId: 'draft-1', projectStatus: ProjectStatus.CONFIRMED },
          { projectId: 'ready-1', projectStatus: ProjectStatus.CONFIRMED },
        ],
        sets,
      ),
    ).toEqual({
      total: 3,
      notStarted: 1,
      draft: 1,
      ready: 1,
      confirmed: 2,
    });
  });

  it('returns zeros for an empty selection', () => {
    expect(tallyPeProjectStats([], emptySets())).toEqual({
      total: 0,
      notStarted: 0,
      draft: 0,
      ready: 0,
      confirmed: 0,
    });
  });
});
