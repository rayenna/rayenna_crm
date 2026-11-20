import { describe, expect, it } from 'vitest';
import {
  consonantSkeleton,
  isConfidentNameMatch,
  nameSimilarity,
  rankNameMatches,
} from './nameFuzzy';

describe('nameFuzzy', () => {
  it('scores AhmedUni ≈ Ahammedunni highly', () => {
    const score = nameSimilarity('AhmedUni', 'Ahammedunni');
    expect(score).toBeGreaterThanOrEqual(0.78);
    expect(consonantSkeleton('AhmedUni')).toBe(consonantSkeleton('Ahammedunni'));
  });

  it('scores Ahmed Unni ≈ Ahammedunni highly', () => {
    expect(nameSimilarity('Ahmed Unni', 'Ahammedunni')).toBeGreaterThanOrEqual(0.78);
  });

  it('does not treat single-letter names as strong matches', () => {
    expect(nameSimilarity('Ahmed Unni', 'N')).toBeLessThan(0.5);
    expect(nameSimilarity('Ahmed Unni', 'K')).toBeLessThan(0.5);
  });

  it('ranks Ahammedunni above initial-only N', () => {
    const ranked = rankNameMatches(
      'Ahmed Unni',
      [
        { firstName: 'N', customerName: null },
        { firstName: 'N', customerName: 'Ahammedunni' },
        { firstName: 'SESSY', customerName: 'SESSY ANTONY' },
      ],
      (c) => c.firstName || c.customerName || '',
      {
        getNames: (c) => [c.customerName, c.firstName],
      },
    );
    expect(ranked[0]?.name.toLowerCase()).toContain('ahammedunni');
    expect(isConfidentNameMatch(ranked)).toBe(true);
  });

  it('ranks nearest neighbour above unrelated names', () => {
    const ranked = rankNameMatches(
      'AhmedUni',
      [
        { name: 'SESSY ANTONY' },
        { name: 'Ahammedunni' },
        { name: 'SABU K F' },
        { name: 'Ahmed Unni' },
      ],
      (c) => c.name,
    );
    expect(ranked[0]?.name).toMatch(/Ahammedunni|Ahmed Unni/i);
    expect(ranked.every((r) => r.score >= 0.62)).toBe(true);
  });

  it('does not confidently match unrelated short names', () => {
    const ranked = rankNameMatches(
      'Ali',
      [{ name: 'SESSY ANTONY' }, { name: 'SABU K F' }],
      (c) => c.name,
    );
    expect(isConfidentNameMatch(ranked)).toBe(false);
  });
});
