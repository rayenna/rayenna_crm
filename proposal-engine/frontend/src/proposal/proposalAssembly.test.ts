import { describe, expect, it } from 'vitest';
import { genRef } from './proposalAssembly';
import { fmtINR, fmtINRFull } from './format';

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
