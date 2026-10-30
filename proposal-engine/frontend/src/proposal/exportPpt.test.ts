import { describe, expect, it } from 'vitest';
import {
  commercialsFromProposal,
  htmlToPlainText,
  proposalDownloadStem,
} from './exportPpt';
import type { ProposalData } from './types';

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
    expect(c).toEqual({
      grandRounded: 118000,
      preGst: 100000,
      gstAmount: 18000,
      gstLabel: 'GST (mixed: 5% & 18%)',
      sizeKw: 5,
      subsidyAmt: 0,
      showSubsidy: false,
    });
  });

  it('returns null when there is no project cost', () => {
    expect(commercialsFromProposal({ ...base, sheet: null, roiAutofill: null, roi: null })).toBeNull();
  });
});
