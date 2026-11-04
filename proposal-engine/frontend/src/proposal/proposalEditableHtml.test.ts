import { describe, expect, it } from 'vitest';
import { extractTextOverridesFromHtml } from './proposalEditableHtml';

const hasDom = typeof DOMParser !== 'undefined';

describe('extractTextOverridesFromHtml', () => {
  it.skipIf(!hasDom)('extracts paragraph overrides from an HTML string', () => {
    const html = `<p data-docx-section="about-p1">Saved edit here</p>`;
    expect(extractTextOverridesFromHtml(html)).toEqual({ 'about-p1': 'Saved edit here' });
  });

  it.skipIf(!hasDom)('extracts list overrides from data-docx-list-text nodes', () => {
    const html = `
      <div data-docx-section="list-warranty">
        <span data-docx-list-text>One year</span>
        <span data-docx-list-text>Five years</span>
      </div>`;
    expect(extractTextOverridesFromHtml(html)['list-warranty']).toBe('One year\nFive years');
  });

  it('returns empty object for blank html without throwing', () => {
    expect(extractTextOverridesFromHtml('')).toEqual({});
    expect(extractTextOverridesFromHtml('   ')).toEqual({});
  });
});
