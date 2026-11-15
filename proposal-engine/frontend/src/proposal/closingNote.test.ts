import { describe, expect, it } from 'vitest';
import { closingNoteModel, closingText, isCollapsedClosingNote } from './proposalCopy';
import type { ProposalData } from './types';

const p: ProposalData = {
  refNumber: 'REY/T',
  generatedAt: '2026-01-01T00:00:00.000Z',
  customer: {
    customerName: 'NEETHUMOL GS',
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

describe('closingNoteModel / closingText', () => {
  it('includes the customer name in the partner paragraph', () => {
    const m = closingNoteModel(p);
    expect(m.para2).toContain('NEETHUMOL GS');
    expect(m.contactIntro).toMatch(/contact us at:/i);
  });

  it('uses letter-style blank lines and a single contact row', () => {
    const text = closingText(p);
    const lines = text.split('\n');
    expect(lines.some((l) => l.trim() === '')).toBe(true);
    expect(text).toContain('📞 +91 7907 369 304');
    expect(text).toContain('📧 sales@rayenna.energy');
    expect(text).toContain('🌐 www.rayennaenergy.com');
    // Contact icons share one line (not three stacked log lines)
    const contactLine = lines.find((l) => l.includes('📞') && l.includes('📧'));
    expect(contactLine).toBeTruthy();
    expect(text.indexOf('Warm regards,')).toBeLessThan(text.indexOf('Sales Team'));
    expect(text.indexOf('Sales Team')).toBeLessThan(text.indexOf('Rayenna Energy Private Limited'));
    expect(isCollapsedClosingNote(text)).toBe(false);
  });

  it('detects flattened log-style closing overrides', () => {
    expect(
      isCollapsedClosingNote(
        'Thank you for considering Rayenna Energy as your solar partner.Warm regards,Sales TeamRayenna Energy Private Limited',
      ),
    ).toBe(true);
  });
});
