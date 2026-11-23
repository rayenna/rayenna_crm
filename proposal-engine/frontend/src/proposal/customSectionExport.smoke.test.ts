/**
 * @vitest-environment happy-dom
 *
 * Smoke: custom-section toolbar markup survives sanitize and reaches
 * PDF print CSS, Share strip path, DOCX blocks, and PPT plain text.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeProposalCustomBodyHtml } from '../lib/sanitizeProposalCustomHtml';
import { PE_CUSTOM_LIST_STYLE_CSS } from '../lib/proposalEditorListStyles';
import { PROPOSAL_PRINT_CSS } from './exportPdf';
import { htmlToPlainText } from './exportPpt';
import { proposalCustomSectionsToDocxBlocks } from '../lib/proposalCustomSectionsDocx';
import * as docx from 'docx';

const SAMPLE_CUSTOM_HTML = `
  <p>Intro with <s>old price</s> and <span style="text-decoration: line-through">strike</span>.</p>
  <ul style="list-style-type: square"><li>Square bullet one</li><li>Square bullet two</li></ul>
  <ol data-pe-list="decimal-paren" style="list-style-type:none">
    <li>First paren</li>
    <li>Second paren</li>
  </ol>
  <ol style="list-style-type: upper-roman"><li>Roman one</li><li>Roman two</li></ol>
`.trim();

describe('custom section export smoke', () => {
  it('sanitizer keeps strikethrough tags and Numbering Library data-pe-list', () => {
    const clean = sanitizeProposalCustomBodyHtml(SAMPLE_CUSTOM_HTML);
    expect(clean).toContain('data-pe-list="decimal-paren"');
    expect(clean.includes('<s>') || clean.includes('line-through')).toBe(true);
    expect(clean).toMatch(/list-style-type:\s*square/i);
    expect(clean).toContain('Square bullet one');
    expect(clean).toContain('First paren');
  });

  it('PDF print CSS includes parenthesis list markers and never prints box-shadow slabs', () => {
    expect(PROPOSAL_PRINT_CSS).toContain(PE_CUSTOM_LIST_STYLE_CSS.slice(0, 40));
    expect(PROPOSAL_PRINT_CSS).toMatch(/\[data-pe-list="decimal-paren"\]/);
    expect(PROPOSAL_PRINT_CSS).toMatch(/box-shadow:\s*none\s*!important/);
  });

  it('Share strip removes print-hide chrome but keeps custom list markup', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="print-hide">Edit toolbar</div>
      <div class="pdf-section-unit section-edit-excluded"><p>Excluded optional</p></div>
      <div data-pe-custom-body="s1">${SAMPLE_CUSTOM_HTML}</div>
    `;
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.print-hide').forEach((n) => n.remove());
    clone.querySelectorAll('.section-edit-excluded').forEach((n) => n.remove());
    expect(clone.textContent).not.toContain('Edit toolbar');
    expect(clone.textContent).not.toContain('Excluded optional');
    expect(clone.innerHTML).toContain('data-pe-list="decimal-paren"');
    expect(clone.innerHTML).toContain('Square bullet one');
  });

  it('PPT htmlToPlainText keeps list item text from custom HTML', () => {
    const plain = htmlToPlainText(SAMPLE_CUSTOM_HTML);
    expect(plain).toContain('Square bullet one');
    expect(plain).toContain('First paren');
    expect(plain).toContain('Roman one');
    expect(plain).toMatch(/• /);
  });

  it('DOCX custom-section blocks emit ordered and bullet markers', () => {
    const blocks = proposalCustomSectionsToDocxBlocks(
      [{ id: 'c1', title: 'Site notes', bodyHtml: SAMPLE_CUSTOM_HTML }],
      undefined,
      docx,
    );
    expect(blocks.length).toBeGreaterThan(3);
    const texts = blocks.map((b) => {
      try {
        // Paragraph JSON varies by docx version; stringify is enough for smoke.
        return JSON.stringify(b);
      } catch {
        return '';
      }
    }).join('\n');
    expect(texts).toMatch(/Square bullet one|First paren|Roman/);
    expect(texts).toMatch(/1\)|I\.|•|■/);
  });
});
