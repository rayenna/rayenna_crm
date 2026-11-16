import { describe, expect, it } from 'vitest';
import { PDF_BREAK_BEFORE_PAGE, sectionBreaksBeforePage } from './pdfPageBreaks';
import { PROPOSAL_PRINT_CSS } from './exportPdf';

describe('pdfPageBreaks', () => {
  it('only BOQ forces a new PDF page (Closing Note flows with prior content)', () => {
    expect([...PDF_BREAK_BEFORE_PAGE]).toEqual(['bom']);
    expect(sectionBreaksBeforePage('bom')).toBe(true);
    expect(sectionBreaksBeforePage('closing-note')).toBe(false);
    expect(sectionBreaksBeforePage('commercials')).toBe(false);
    expect(sectionBreaksBeforePage('subsidy-disclaimer')).toBe(false);
  });

  it('print CSS implements unit-level breaks only (corporate blank-page contract)', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-section-unit\[data-pdf-break-before="page"\]/,
    );
    // No inner data-pdf-section may own a forced page start.
    const offenders = [
      ...PROPOSAL_PRINT_CSS.matchAll(/\[data-pdf-section="[^"]+"\]\s*\{[^}]*\}/g),
    ]
      .map((m) => m[0])
      .filter(
        (rule) =>
          /break-before:\s*page/.test(rule) ||
          /page-break-before:\s*always/.test(rule),
      );
    expect(offenders).toEqual([]);
  });
});
