import { describe, expect, it } from 'vitest';
import { amountInWordsINR } from './amountInWords';

describe('amountInWordsINR', () => {
  it('handles zero', () => {
    expect(amountInWordsINR(0)).toBe('Rupees Zero Only');
  });

  it('handles small amounts', () => {
    expect(amountInWordsINR(21)).toBe('Rupees Twenty-One Only');
    expect(amountInWordsINR(105)).toBe('Rupees One Hundred Five Only');
  });

  it('handles lakhs', () => {
    expect(amountInWordsINR(2_73_820)).toBe(
      'Rupees Two Lakh Seventy-Three Thousand Eight Hundred Twenty Only',
    );
  });

  it('handles crores', () => {
    expect(amountInWordsINR(1_07_00_000)).toBe('Rupees One Crore Seven Lakh Only');
  });

  it('rounds fractions', () => {
    expect(amountInWordsINR(99.6)).toBe('Rupees One Hundred Only');
  });
});
