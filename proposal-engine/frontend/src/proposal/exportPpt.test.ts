import { describe, expect, it } from 'vitest';
import {
  commercialsFromProposal,
  customSectionHasExportableContent,
  extractCustomSectionImages,
  htmlToPlainText,
  normalizePptImageDataUri,
  proposalDownloadStem,
} from './exportPpt';
import type { ProposalData } from './types';

/** 1×1 PNG */
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const base: ProposalData = {
  refNumber: 'REY/2026/04/PRJ-0100/CUST-ZYJ904',
  generatedAt: '2026-04-21T00:00:00.000Z',
  customer: {
    customerName: 'Jessy',
    location: 'Kochi',
    contactPerson: '',
    phone: '',
    email: '',
  },
  systemSizeKw: 5,
  systemType: 'HYBRID',
  sheet: {
    id: 's1',
    name: 'Sheet',
    description: '',
    savedAt: '',
    items: [],
    showGst: true,
    marginPercent: 15,
    grandTotal: 118000,
    totalGst: 18000,
    systemSizeKw: 5,
  },
  bom: [],
  roi: null,
  roiAutofill: null,
};

describe('htmlToPlainText', () => {
  it('strips tags and keeps list bullets', () => {
    expect(htmlToPlainText('<p>Hello</p><ul><li>One</li><li>Two</li></ul>')).toBe(
      'Hello\n\n• One\n• Two',
    );
  });
});

describe('custom section PPT images', () => {
  it('normalizePptImageDataUri accepts png data URIs and rejects junk', () => {
    expect(normalizePptImageDataUri(TINY_PNG)).toBe(TINY_PNG);
    expect(normalizePptImageDataUri('https://example.com/a.png')).toBeNull();
    expect(normalizePptImageDataUri('data:image/png;base64,')).toBeNull();
  });

  it('extractCustomSectionImages pulls data-URI imgs from HTML', () => {
    const html = `<p>Panel layout</p><img src="${TINY_PNG}" alt="layout" /><p>Note</p>`;
    const imgs = extractCustomSectionImages(html);
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toBe(TINY_PNG);
    expect(htmlToPlainText(html)).toContain('Panel layout');
    expect(htmlToPlainText(html)).not.toContain('data:image');
  });

  it('keeps image-only custom sections as exportable', () => {
    expect(
      customSectionHasExportableContent({
        id: 'c1',
        title: '',
        bodyHtml: `<img src="${TINY_PNG}" />`,
      }),
    ).toBe(true);
    expect(
      customSectionHasExportableContent({
        id: 'c2',
        title: '',
        bodyHtml: '<p>   </p>',
      }),
    ).toBe(false);
    expect(
      customSectionHasExportableContent({
        id: 'c3',
        title: 'Site panel layout',
        bodyHtml: '',
      }),
    ).toBe(true);
  });
});

describe('proposalDownloadStem', () => {
  it('builds a safe file stem from customer and ref', () => {
    expect(proposalDownloadStem(base)).toBe(
      'Rayenna_Proposal_Jessy_REY-2026-04-PRJ-0100-CUST-ZYJ904',
    );
  });
});

describe('commercialsFromProposal', () => {
  it('uses sheet GST when a costing sheet is present', () => {
    const c = commercialsFromProposal(base);
    expect(c).toMatchObject({
      grandRounded: 118000,
      preGst: 100000,
      gstAmount: 18000,
      gstLabel: 'GST (mixed: 5% & 18%)',
      sizeKw: 5,
      subsidyAmt: 0,
      showSubsidy: false,
      payableToRayenna: 118000,
      effectiveAfterSubsidy: 118000,
    });
    expect(c?.payableInWords).toMatch(/^Rupees /);
  });

  it('returns null when there is no project cost', () => {
    expect(commercialsFromProposal({ ...base, sheet: null, roiAutofill: null, roi: null })).toBeNull();
  });
});
