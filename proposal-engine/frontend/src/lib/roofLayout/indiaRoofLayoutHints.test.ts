import { describe, expect, it } from 'vitest';
import {
  formatModuleEdgeGapHint,
  moduleEdgeGapMetres,
} from './indiaRoofLayoutHints';

describe('indiaRoofLayoutHints', () => {
  it('computes module edge gap from spacing multiplier', () => {
    expect(moduleEdgeGapMetres(1.5)).toBeCloseTo(0.3, 3);
    expect(moduleEdgeGapMetres(1.0)).toBeCloseTo(0.2, 3);
  });

  it('formats gap hint for default medium density', () => {
    expect(formatModuleEdgeGapHint(1.5)).toContain('300 mm');
  });
});
