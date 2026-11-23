/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { sanitizeProposalCustomBodyHtml } from './sanitizeProposalCustomHtml';

describe('sanitizeProposalCustomBodyHtml list/strike', () => {
  it('keeps data-pe-list and strikethrough markup', () => {
    const html =
      '<ol data-pe-list="decimal-paren" style="list-style-type:none"><li>One</li></ol>' +
      '<p><s>struck</s><span style="text-decoration: line-through">x</span></p>';
    const out = sanitizeProposalCustomBodyHtml(html);
    expect(out).toContain('data-pe-list="decimal-paren"');
    expect(out.includes('<s>') || out.includes('line-through')).toBe(true);
  });
});
