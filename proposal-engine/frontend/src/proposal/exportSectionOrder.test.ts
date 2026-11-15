import { describe, expect, it } from 'vitest';
import { Paragraph, HeadingLevel, TextRun } from 'docx';
import {
  buildDocx,
  PE_DOCX_SECTION_HEADING,
  readDocxSectionHeading,
  reorderDocxBodyBySectionOrder,
} from './exportDocx';
import { pptOrderedBodySectionIds } from './exportPpt';
import { defaultSectionOrder } from './sectionOrder';
import { defaultIncludedOptionalSections } from './optionalSections';
import type { ProposalData } from './types';

const minimalProposal: ProposalData = {
  refNumber: 'REY/T',
  generatedAt: '2026-01-01T00:00:00.000Z',
  customer: {
    customerName: 'Test',
    location: 'Kochi',
    contactPerson: '',
    phone: '',
    email: '',
  },
  systemSizeKw: 5,
  systemType: 'HYBRID',
  sheet: null,
  bom: [],
  roi: null,
  roiAutofill: null,
};

function taggedHeading(text: string) {
  const para = new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
  });
  Object.defineProperty(para, PE_DOCX_SECTION_HEADING, {
    value: text,
    enumerable: false,
  });
  return para;
}

describe('DOCX section heading detection', () => {
  it('reads the private section-heading tag', () => {
    const para = taggedHeading('Closing Note');
    expect(readDocxSectionHeading(para)).toBe('Closing Note');
  });

  it('falls back to Heading2 XML text when untagged', () => {
    const para = new Paragraph({
      text: 'About Rayenna Energy',
      heading: HeadingLevel.HEADING_2,
    });
    expect(readDocxSectionHeading(para)).toBe('About Rayenna Energy');
  });

  it('ignores non-heading body paragraphs', () => {
    const para = new Paragraph({
      children: [new TextRun({ text: 'About Rayenna Energy is great' })],
    });
    expect(readDocxSectionHeading(para)).toBeNull();
  });
});

describe('reorderDocxBodyBySectionOrder', () => {
  it('moves body sections while keeping prefix and Generated footer fixed', () => {
    const prefix = new Paragraph({ text: 'cover' });
    const exec = new Paragraph({ text: 'exec body' });
    const about = taggedHeading('About Rayenna Energy');
    const aboutBody = new Paragraph({ text: 'about body' });
    const closing = taggedHeading('Closing Note');
    const closingBody = new Paragraph({ text: 'closing body' });
    const footer = new Paragraph({
      children: [new TextRun({ text: 'Generated: 1/1/2026  |  REF' })],
    });

    const ordered = reorderDocxBodyBySectionOrder(
      [prefix, exec, about, aboutBody, closing, closingBody, footer],
      ['closing-note', 'about-rayenna'],
    );

    const titles = ordered
      .map((n) => readDocxSectionHeading(n))
      .filter(Boolean);
    expect(titles).toEqual(['Closing Note', 'About Rayenna Energy']);
    expect(ordered[0]).toBe(prefix);
    expect(ordered[1]).toBe(exec);
    expect(JSON.stringify(ordered[ordered.length - 1])).toContain('Generated:');
  });

  it('applies an arbitrary saved sectionOrder (not the build order)', () => {
    const about = taggedHeading('About Rayenna Energy');
    const scope = taggedHeading('Scope of Work');
    const commercials = taggedHeading('Commercials');
    const ordered = reorderDocxBodyBySectionOrder(
      [about, scope, commercials],
      ['commercials', 'about-rayenna', 'scope-of-work'],
    );
    expect(ordered.map((n) => readDocxSectionHeading(n))).toEqual([
      'Commercials',
      'About Rayenna Energy',
      'Scope of Work',
    ]);
  });
});

describe('pptOrderedBodySectionIds', () => {
  it('honours saved sectionOrder', () => {
    const ids = pptOrderedBodySectionIds(['closing-note', 'about-rayenna']);
    expect(ids[0]).toBe('closing-note');
    expect(ids[1]).toBe('about-rayenna');
  });

  it('omits excluded optional sections after Save-style map', () => {
    const included = {
      ...defaultIncludedOptionalSections(),
      warranty: false,
      exclusions: false,
      'key-points': false,
    };
    const ids = pptOrderedBodySectionIds(defaultSectionOrder(), included);
    expect(ids).not.toContain('warranty');
    expect(ids).not.toContain('exclusions');
    expect(ids).not.toContain('key-points');
    expect(ids).toContain('about-rayenna');
    expect(ids).toContain('closing-note');
  });

  it('omits roof layout when not included', () => {
    const ids = pptOrderedBodySectionIds(defaultSectionOrder(), null, {
      includeRoof: false,
      hasBom: true,
      hasCustomSections: true,
    });
    expect(ids).not.toContain('roof-layout');
    expect(ids).toContain('bom');
  });
});

describe('buildDocx respects saved sectionOrder + includes', () => {
  it('places Closing Note before About and omits excluded Warranty / Key Points', async () => {
    const docx = await import('docx');
    const doc = buildDocx(
      minimalProposal,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
      undefined,
      [],
      {},
      docx,
      {
        ...defaultIncludedOptionalSections(),
        warranty: false,
        'key-points': false,
      },
      undefined,
      ['closing-note', 'about-rayenna', ...defaultSectionOrder().filter((id) => id !== 'closing-note')],
    );

    const titles: string[] = [];
    const walk = (n: unknown): void => {
      if (!n || typeof n !== 'object') return;
      const t = readDocxSectionHeading(n);
      if (t) titles.push(t);
      if (Array.isArray(n)) {
        n.forEach(walk);
        return;
      }
      for (const v of Object.values(n as Record<string, unknown>)) {
        if (v && typeof v === 'object') walk(v);
      }
    };
    walk(doc);

    const bodyTitles = titles.filter((t) => t !== 'Executive Summary');
    expect(bodyTitles.indexOf('Closing Note')).toBeGreaterThanOrEqual(0);
    expect(bodyTitles.indexOf('Closing Note')).toBeLessThan(
      bodyTitles.indexOf('About Rayenna Energy'),
    );
    expect(bodyTitles).not.toContain('Warranty');
    expect(bodyTitles).not.toContain('Key Points');
  });
});
