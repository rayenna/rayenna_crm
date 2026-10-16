import { describe, expect, it } from 'vitest';
import { parseZenithNlPriorFilters } from './priorFilters';

describe('parseZenithNlPriorFilters', () => {
  it('keeps city, SLA, stage, and capacity from follow-up prior', () => {
    const filters = parseZenithNlPriorFilters({
      city: 'Kochi',
      statusIndicator: 'red',
      projectStage: 'INSTALLATION',
      capacityMin: 3,
      capacityMax: '5',
      unknownKey: 'drop-me',
    });
    expect(filters).toEqual({
      city: 'Kochi',
      statusIndicator: 'RED',
      projectStage: 'INSTALLATION',
      capacityMin: 3,
      capacityMax: 5,
    });
  });

  it('accepts peBucket only when valid', () => {
    expect(parseZenithNlPriorFilters({ peBucket: 'draft' })?.peBucket).toBe('draft');
    expect(parseZenithNlPriorFilters({ peBucket: 'nope' })).toBeUndefined();
  });
});
