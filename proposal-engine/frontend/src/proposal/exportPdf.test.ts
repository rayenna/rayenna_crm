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
});
