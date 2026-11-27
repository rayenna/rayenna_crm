import { describe, expect, it } from 'vitest';
import {
  mergeFavoriteAskChips,
  normalizeAskPreferences,
} from './askPreferences';

describe('normalizeAskPreferences', () => {
  it('defaults empty', () => {
    expect(normalizeAskPreferences(null)).toEqual({
      defaultPeriod: 'current_fy',
      favoriteQuestions: [],
    });
  });

  it('caps and dedupes favorites', () => {
    const prefs = normalizeAskPreferences({
      defaultPeriod: 'last_quarter',
      favoriteQuestions: [
        'Who should I call today?',
        'who should I call today?',
        'A',
        ...Array.from({ length: 12 }, (_, i) => `Favorite ask ${i}`),
      ],
    });
    expect(prefs.defaultPeriod).toBe('last_quarter');
    expect(prefs.favoriteQuestions[0]).toBe('Who should I call today?');
    expect(prefs.favoriteQuestions.length).toBeLessThanOrEqual(8);
    expect(prefs.favoriteQuestions.every((q) => q.length >= 4)).toBe(true);
  });
});

describe('mergeFavoriteAskChips', () => {
  it('puts favorites first', () => {
    expect(
      mergeFavoriteAskChips(
        ['My morning Ask'],
        ['Who should I call today?', 'My morning Ask', 'Unpaid invoices'],
        5,
      ),
    ).toEqual(['My morning Ask', 'Who should I call today?', 'Unpaid invoices']);
  });
});
