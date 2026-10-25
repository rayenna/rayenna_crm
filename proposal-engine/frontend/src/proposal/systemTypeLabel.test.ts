import { describe, expect, it } from 'vitest';
import { proposalForHeading, systemTypeHeadingTerm } from './systemTypeLabel';

describe('systemTypeHeadingTerm', () => {
  it('uses the CRM Sales & Commercial labels', () => {
    expect(systemTypeHeadingTerm('OFF_GRID')).toBe('Off-Grid');
    expect(systemTypeHeadingTerm('ON_GRID')).toBe('On-Grid');
    expect(systemTypeHeadingTerm('HYBRID')).toBe('Hybrid');
  });

  it('accepts spaced and hyphenated values', () => {
    expect(systemTypeHeadingTerm('Off-Grid')).toBe('Off-Grid');
    expect(systemTypeHeadingTerm('on grid')).toBe('On-Grid');
  });

  it('defaults to On-Grid when the CRM project has no system type', () => {
    expect(systemTypeHeadingTerm(null)).toBe('On-Grid');
    expect(systemTypeHeadingTerm('')).toBe('On-Grid');
    expect(systemTypeHeadingTerm('UNKNOWN')).toBe('On-Grid');
  });
});

describe('proposalForHeading', () => {
  it('includes capacity and the CRM system type', () => {
    expect(proposalForHeading(5, 'OFF_GRID')).toBe('5 kW Off-Grid Solar Power Plant');
    expect(proposalForHeading(0, 'HYBRID')).toBe('Hybrid Solar Power Plant');
  });
});
