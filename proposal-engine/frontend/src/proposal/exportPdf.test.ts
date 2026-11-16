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

  it('forces Bill of Quantities onto a new page via the section UNIT, not the inner block', () => {
    // Unit-level stamp — Divider stays with BOQ (no blank orphan page).
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-section-unit\[data-pdf-break-before="page"\][\s\S]{0,200}break-before:\s*page\s*!important/,
    );
    // Inner bom must NOT force its own page break (orphans the leading Divider).
    const bomInner = PROPOSAL_PRINT_CSS.match(
      /\[data-pdf-section="bom"\]\s*\{[^}]*\}/,
    )?.[0];
    expect(bomInner).toMatch(/break-before:\s*auto\s*!important/);
    expect(bomInner).not.toMatch(/break-before:\s*page/);
    expect(bomInner).not.toMatch(/page-break-after:\s*always/);
  });

  it('keeps Cover + contact strip on page 1 and centres them', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="cover-first-page"\][\s\S]*page-break-after:\s*always\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="cover-first-page"\][\s\S]*justify-content:\s*center\s*!important/,
    );
    // Cover alone must not force a page break (that split contact onto page 2)
    expect(PROPOSAL_PRINT_CSS).not.toMatch(
      /\[data-pdf-section="cover"\]\s*\{[^}]*page-break-after:\s*always/,
    );
  });

  it('prints the cover hero wallpaper without the global img max-height clamp', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /img\[data-docx-image="cover-hero"\][\s\S]*max-height:\s*none\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /img\[data-docx-image="cover-hero"\][\s\S]*object-fit:\s*cover\s*!important/,
    );
  });

  it('keeps the Financial Benefits chart from splitting across pages', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-keep="financial-chart"\][\s\S]*page-break-inside:\s*avoid\s*!important/,
    );
  });

  it('keeps the About Rayenna Key Highlights table from splitting across pages', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-keep="key-highlights"\][\s\S]*page-break-inside:\s*avoid\s*!important/,
    );
  });

  it('hides mid-edit greyed optional sections in print CSS', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.section-edit-excluded\s*\{[\s\S]*display:\s*none\s*!important/,
    );
  });

  it('keeps section heading icon–title gap consistent (flex gap-3, not table-cell)', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-section-heading[\s\S]*gap:\s*0\.75rem\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).not.toMatch(
      /\.pdf-section-heading\s*>\s*\*[\s\S]*display:\s*table-cell/,
    );
  });

  it('does not force a page break before Closing Note (flows after prior section)', () => {
    // Unit-level break stamp still exists for BOM only.
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-section-unit\[data-pdf-break-before="page"\][\s\S]{0,200}break-before:\s*page\s*!important/,
    );
    const closingInner = PROPOSAL_PRINT_CSS.match(
      /\[data-pdf-section="section-closing-note"\]\s*\{[^}]*\}/,
    )?.[0];
    expect(closingInner).toMatch(/break-before:\s*auto\s*!important/);
    expect(closingInner).not.toMatch(/break-before:\s*page/);
    const subsidyRule = PROPOSAL_PRINT_CSS.match(
      /\[data-pdf-section="section-subsidy-disclaimer-and-payment-terms"\][\s\S]{0,280}page-break-after:\s*auto\s*!important/,
    );
    expect(subsidyRule).toBeTruthy();
  });

  it('never forces page-break-before on an inner [data-pdf-section] (blank-page anti-pattern)', () => {
    // Any forced new page must use .pdf-section-unit[data-pdf-break-before="page"].
    const innerForcedBreaks = [
      ...PROPOSAL_PRINT_CSS.matchAll(
        /\[data-pdf-section="[^"]+"\]\s*\{[^}]*\}/g,
      ),
    ]
      .map((m) => m[0])
      .filter(
        (rule) =>
          /break-before:\s*page/.test(rule) ||
          /page-break-before:\s*always/.test(rule),
      );
    expect(innerForcedBreaks).toEqual([]);
  });

  it('strips Closing Note image shadow so PDF does not show a grey slab', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{[\s\S]{0,200}box-shadow:\s*none\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /img\[data-docx-image="closing-solar"\][\s\S]{0,500}box-shadow:\s*none\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="section-closing-note"\]\s*\.closing-note-hero\s*\{[\s\S]{0,500}box-shadow:\s*none\s*!important/,
    );
  });

  it('does not force a page break before Commercials (follows BOQ)', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="commercials"\][\s\S]*page-break-before:\s*auto\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).not.toMatch(
      /\[data-pdf-section="commercials"\][\s\S]*page-break-before:\s*always/,
    );
  });

  it('does not force a page break before Technical Details (follows Responsibility Matrix)', () => {
    const techRule = PROPOSAL_PRINT_CSS.match(
      /\[data-pdf-section="technical-details"\]\s*\{[^}]*\}/,
    )?.[0];
    expect(techRule).toMatch(/page-break-before:\s*auto\s*!important/);
    expect(techRule).not.toMatch(/page-break-before:\s*always/);
  });

  it('avoids a trailing blank page after the last section unit', () => {
    // break-after:avoid on the LAST unit makes Chromium emit a blank sheet —
    // last unit must use auto + zero bottom margin instead.
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-section-unit:last-of-type[\s\S]{0,220}page-break-after:\s*auto\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-section-unit:last-of-type[\s\S]{0,220}margin-bottom:\s*0\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.closing-note-sign-spacer[\s\S]{0,120}height:\s*0\.5rem\s*!important/,
    );
  });

  it('forces an opaque cover CLIENT panel and hides CSS wash in print', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-cover-wash\][\s\S]{0,80}display:\s*none\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-cover-client\][\s\S]{0,200}background(?:-color)?:\s*#0d1b3a\s*!important/,
    );
  });

  it('keeps Warranty table and Authority fees footnote from splitting into empty framed gaps', () => {
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="warranty-table"\][\s\S]{0,160}page-break-inside:\s*avoid\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /table\.pdf-warranty-table[\s\S]{0,200}page-break-inside:\s*avoid\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-authority-fees[\s\S]{0,120}page-break-inside:\s*avoid\s*!important/,
    );
  });

  it('uses a standard one-line gap after each section and before the next heading', () => {
    // Padding (not margin) — one line above + one line below the hairline.
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-divider[\s\S]{0,240}padding-top:\s*1em\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-divider[\s\S]{0,320}padding-bottom:\s*1em\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-divider[\s\S]{0,200}margin-top:\s*0\s*!important/,
    );
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\.pdf-section,\s*\n\s*\.pdf-section-unit\s*\{[\s\S]{0,200}margin-bottom:\s*0\s*!important/,
    );
    // Payment must not add a special larger gap.
    expect(PROPOSAL_PRINT_CSS).toMatch(
      /\[data-pdf-section="payment-milestones"\][\s\S]{0,200}padding-top:\s*0\s*!important/,
    );
  });
});

