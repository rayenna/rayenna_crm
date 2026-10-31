import { describe, expect, it } from 'vitest';
import { isPeTheme } from './theme';

describe('isPeTheme', () => {
  it('accepts light and dark', () => {
    expect(isPeTheme('light')).toBe(true);
    expect(isPeTheme('dark')).toBe(true);
  });

  it('rejects other values', () => {
    expect(isPeTheme('system')).toBe(false);
    expect(isPeTheme(null)).toBe(false);
    expect(isPeTheme('')).toBe(false);
  });
});
