import { describe, expect, it } from 'vitest';
import { deriveRoofLayoutWorkflowStep } from './roofLayoutWorkflow';

describe('deriveRoofLayoutWorkflowStep', () => {
  it('advances to review after save while still in editing mode', () => {
    expect(
      deriveRoofLayoutWorkflowStep({
        hasActiveProject: true,
        hasLayoutResult: true,
        layoutMode: 'editing',
        hasPolygon: true,
        isSavedForProject: true,
        mapTool: 'scroll',
      }),
    ).toBe('review');
  });

  it('stays on place before first save', () => {
    expect(
      deriveRoofLayoutWorkflowStep({
        hasActiveProject: true,
        hasLayoutResult: true,
        layoutMode: 'editing',
        hasPolygon: true,
        isSavedForProject: false,
        mapTool: 'scroll',
      }),
    ).toBe('place');
  });
});
