import { describe, expect, it } from 'vitest';
import {
  isAppleTouchDevice,
  shouldPreventToolbarTouchDefault,
} from './peEditorToolbarTouch';

describe('peEditorToolbarTouch', () => {
  it('detects iPhone / iPad user agents', () => {
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
        platform: 'iPad',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('detects iPadOS desktop UA (MacIntel + touch)', () => {
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('does not treat Android / desktop as Apple touch', () => {
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
    ).toBe(false);
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });

  it('skips toolbar touchstart preventDefault only on Apple touch devices', () => {
    expect(
      shouldPreventToolbarTouchDefault({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(false);
    expect(
      shouldPreventToolbarTouchDefault({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });
});
