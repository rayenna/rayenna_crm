import { describe, expect, it } from 'vitest';
import {
  defaultIncludedOptionalSections,
  isOptionalSectionIncluded,
  normalizeIncludedOptionalSections,
} from './optionalSections';

describe('optionalSections', () => {
  it('defaults every optional section to included', () => {
    const d = defaultIncludedOptionalSections();
    expect(d['environmental-impact']).toBe(true);
    expect(d['subsidy-disclaimer']).toBe(true);
    expect(Object.values(d).every(Boolean)).toBe(true);
  });

  it('normalizes partial maps without dropping unknown defaults', () => {
    const n = normalizeIncludedOptionalSections({
      'our-process': false,
      'warranty': false,
    });
    expect(n['our-process']).toBe(false);
    expect(n['warranty']).toBe(false);
    expect(n['technical-details']).toBe(true);
  });

  it('isOptionalSectionIncluded defaults to true when unset', () => {
    expect(isOptionalSectionIncluded('key-points', null)).toBe(true);
    expect(isOptionalSectionIncluded('key-points', { 'key-points': false })).toBe(false);
  });
});
