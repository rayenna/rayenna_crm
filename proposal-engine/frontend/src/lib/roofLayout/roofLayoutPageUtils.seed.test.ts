import { describe, expect, it } from 'vitest';
import { ROOF_LAYOUT_METERS_PER_PIXEL } from '../roofLayoutConstants';
import { initialPolygonHalfExtentsPx } from './roofLayoutPageUtils';

describe('initialPolygonHalfExtentsPx', () => {
  it('matches backend seed sizing for 5 kW / 550 W', () => {
    const result = initialPolygonHalfExtentsPx(5, 550, 1024, ROOF_LAYOUT_METERS_PER_PIXEL);
    expect(result).toEqual({ halfWPx: 22, halfHPx: 20 });
  });
});
