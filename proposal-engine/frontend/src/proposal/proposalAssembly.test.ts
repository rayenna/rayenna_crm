import { describe, expect, it } from 'vitest';
import { genRef, buildProposal, rehydrateProposalData } from './proposalAssembly';
import { fmtINR, fmtINRFull } from './format';
import type { CustomerDetails, ROIResult } from './types';

describe('genRef', () => {
  it('includes year and month', () => {
    const ref = genRef();
    expect(ref).toMatch(/^REY\/\d{4}\/\d{2}\//);
  });

  it('includes project and customer when provided', () => {
    const ref = genRef({ projectNumber: 42, customerNumber: 'C000123' });
    expect(ref).toContain('PRJ-0042');
    expect(ref).toContain('CUST-C000123');
  });
});

describe('fmtINR', () => {
  it('formats lakhs', () => {
    expect(fmtINR(500_000)).toBe('₹5.00 L');
  });
});

describe('fmtINRFull', () => {
  it('formats full rupees without decimals', () => {
    expect(fmtINRFull(1234567)).toBe('₹12,34,567');
  });
});

const customer: CustomerDetails = {
  customerName: 'Test',
  location: 'Addr',
  contactPerson: '',
  phone: '',
  email: '',
};

/** Stale ROI artifact as saved when costing autofill wrote a decimal kW. */
const staleRoi: ROIResult = {
  inputs: {
    systemSizeKw: 10.46,
    tariff: 8.2,
    generationFactor: 1500,
    escalationPercent: 5,
    projectCost: 400000,
  },
  annualGeneration: 15690,
  annualSavings: 128658,
  paybackYears: 3,
  totalSavings25Years: 1,
  roiPercent: 30,
  lcoe: 2,
  co2OffsetTons: 1,
};

describe('buildProposal system capacity', () => {
  it('prefers CRM Project System Capacity over costing autofill decimals', () => {
    const p = buildProposal(
      customer,
      null,
      [],
      staleRoi,
      { source: 'costing-sheet', sourceName: 'x', savedAt: '', systemSizeKw: 10.46, grandTotal: 400000 },
      { crmSystemSizeKw: 10 },
    );
    expect(p.systemSizeKw).toBe(10);
  });

  it('uses explicit override over CRM', () => {
    const p = buildProposal(
      customer,
      null,
      [],
      staleRoi,
      null,
      { crmSystemSizeKw: 10 },
      { systemSizeKwOverride: 11 },
    );
    expect(p.systemSizeKw).toBe(11);
  });

  it('falls back to autofill when CRM is missing', () => {
    const p = buildProposal(
      customer,
      null,
      [],
      staleRoi,
      { source: 'costing-sheet', sourceName: 'x', savedAt: '', systemSizeKw: 10.46, grandTotal: 400000 },
      { crmSystemSizeKw: null },
    );
    expect(p.systemSizeKw).toBe(10.46);
  });
});

describe('rehydrateProposalData system capacity', () => {
  it('prefers CRM over autofill decimals', () => {
    const p = rehydrateProposalData(
      { refNumber: 'REY/2026/07/x', generatedAt: new Date().toISOString() },
      customer,
      null,
      [],
      staleRoi,
      { source: 'costing-sheet', sourceName: 'x', savedAt: '', systemSizeKw: 10.46, grandTotal: 400000 },
      { crmSystemSizeKw: 10 },
    );
    expect(p.systemSizeKw).toBe(10);
  });
});
