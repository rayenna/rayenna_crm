import { describe, expect, it } from 'vitest';
import { PROPOSAL_PRINT_CSS } from './exportPdf';

describe('PROPOSAL_PRINT_CSS', () => {
  it('lets the BOQ table and overflow wrappers split across pages', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(/table[\s\S]*page-break-inside:\s*auto\s*!important/);
    expect(PROPOSAL_PRINT_CSS).toMatch(/\.overflow-x-auto[\s\S]*overflow:\s*visible\s*!important/);
    expect(PROPOSAL_PRINT_CSS).toMatch(/\.rounded-xl[\s\S]*page-break-inside:\s*auto\s*!important/);
  });

  it('does not keep entire rounded-xl blocks unbreakable', () => {
    const roundedRule = PROPOSAL_PRINT_CSS.match(/\.rounded-xl[\s\S]*?}/);
    expect(roundedRule?.[0]).not.toMatch(/page-break-inside:\s*avoid/);
  });

  it('prints Our Process as a 2-column grid so cards are not clipped', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-process-steps[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)/,
    );
  });

  it('forces Bill of Quantities onto a new page without an after-break on the prior section', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="bom"\][\s\S]*page-break-before:\s*always\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="bom"\][\s\S]*break-before:\s*page\s*!important/,
    );
    // Guard against the Chromium blank-page pattern: break-before + break-after pair
    expect(PROPOSAL_PRINT_CSS).not.toMatch(
      /\[data-pdf-section="bom"\][\s\S]*page-break-after:\s*always/,
    );
  });
});
