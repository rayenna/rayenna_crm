import { describe, expect, it } from 'vitest';
import { nextProposalStep } from './proposalContinue';

describe('nextProposalStep', () => {
  it('starts at costing when the price sheet or BOM is missing', () => {
    expect(nextProposalStep({ costing: null, bom: null, roi: null, proposal: null }).path).toBe('/costing');
    expect(nextProposalStep({ costing: {}, bom: null, roi: null, proposal: null }).id).toBe('costing');
  });

  it('opens ROI only when costing and BOM exist and payback does not', () => {
    const step = nextProposalStep({ costing: {}, bom: {}, roi: null, proposal: null });
    expect(step.path).toBe('/roi');
    expect(step.button).toBe('Continue to ROI');
  });

  it('opens the proposal once costing, BOM, and ROI are saved', () => {
    expect(nextProposalStep({ costing: {}, bom: {}, roi: {}, proposal: null }).button).toBe(
      'Continue to proposal',
    );
    expect(nextProposalStep({ costing: {}, bom: {}, roi: {}, proposal: {} }).button).toBe(
      'Review proposal',
    );
  });
});
