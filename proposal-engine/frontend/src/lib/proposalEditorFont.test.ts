import { describe, expect, it } from 'vitest';
import { matchFontFamilyValue, matchFontSizeValue } from './proposalEditorFont';

describe('matchFontFamilyValue', () => {
  it('matches Arial from computed stack', () => {
    expect(matchFontFamilyValue('Arial, Helvetica, sans-serif')).toBe('Arial, sans-serif');
  });

  it('matches Calibri from Word paste', () => {
    expect(matchFontFamilyValue('Calibri, sans-serif')).toBe('Calibri, sans-serif');
  });

  it('returns empty for unknown fonts', () => {
    expect(matchFontFamilyValue('Wingdings')).toBe('');
  });
});

describe('matchFontSizeValue', () => {
  it('matches pt directly', () => {
    expect(matchFontSizeValue('12pt')).toBe('12pt');
  });

  it('maps px to nearest pt', () => {
    expect(matchFontSizeValue('16px')).toBe('12pt');
  });
});
