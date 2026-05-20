import { describe, expect, it } from 'vitest';
import { fmt, toNum } from './format';

describe('costing format helpers', () => {
  it('toNum treats invalid and negative as zero', () => {
    expect(toNum('')).toBe(0);
    expect(toNum('abc')).toBe(0);
    expect(toNum('-5')).toBe(0);
    expect(toNum('12.5')).toBe(12.5);
  });

  it('fmt uses en-IN grouping', () => {
    expect(fmt(1234.5)).toMatch(/1,234/);
  });
});
