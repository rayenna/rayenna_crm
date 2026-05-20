import { describe, expect, it } from 'vitest';
import { roofLayoutAvailabilityMessage } from './roofLayoutForProposal';

describe('roofLayoutAvailabilityMessage', () => {
  it('describes not saved yet for toggle and idle states', () => {
    expect(roofLayoutAvailabilityMessage('not_saved_yet')).toMatch(/not been created/i);
    expect(roofLayoutAvailabilityMessage('not_saved_yet', { forToggleAttempt: true })).toMatch(
      /Save to Proposal/i,
    );
  });

  it('confirms when ready', () => {
    expect(roofLayoutAvailabilityMessage('ready')).toMatch(/available/i);
  });
});
