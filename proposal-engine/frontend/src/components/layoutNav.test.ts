import { describe, expect, it } from 'vitest';
import { shouldUseCompactNav } from './layoutNav';

describe('shouldUseCompactNav', () => {
  it('uses the hamburger when the desktop cluster would overflow', () => {
    expect(shouldUseCompactNav(1100, 1050, false)).toBe(true);
    expect(shouldUseCompactNav(1100, 1050, true)).toBe(true);
  });

  it('keeps the desktop bar when there is room', () => {
    expect(shouldUseCompactNav(1000, 1280, false)).toBe(false);
  });

  it('only expands again after spare width (no flicker)', () => {
    expect(shouldUseCompactNav(1100, 1130, true)).toBe(true);
    expect(shouldUseCompactNav(1100, 1200, true)).toBe(false);
  });

  it('treats missing measurements as compact', () => {
    expect(shouldUseCompactNav(0, 0, false)).toBe(true);
    expect(shouldUseCompactNav(Number.NaN, 800, false)).toBe(true);
  });
});
