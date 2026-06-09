import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ROOF_LAYOUT_METERS_PER_PIXEL,
  ROOF_LAYOUT_PANEL_AREA_M2,
  ROOF_LAYOUT_PANEL_SPACING_FACTOR,
  ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX,
  ROOF_LAYOUT_SEED_POLYGON_ASPECT,
  ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX,
  ROOF_LAYOUT_USABLE_AREA_FACTOR,
} from './roofLayoutConstants';

const BACKEND_SCALE_PATH = join(
  import.meta.dirname,
  '../../../../src/constants/roofLayoutScale.ts',
);

function readBackendExport(name: string): number {
  const src = readFileSync(BACKEND_SCALE_PATH, 'utf8');
  const literal = src.match(new RegExp(`export const ${name} = ([0-9.]+)`));
  if (literal) return Number(literal[1]);
  if (name === 'ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX') {
    return readBackendExport('ROOF_LAYOUT_SATELLITE_IMAGE_PX') / 2;
  }
  throw new Error(`Missing backend export: ${name}`);
}

describe('roofLayoutConstants backend parity', () => {
  it('scale constants match src/constants/roofLayoutScale.ts', () => {
    expect(ROOF_LAYOUT_METERS_PER_PIXEL).toBe(readBackendExport('ROOF_LAYOUT_METERS_PER_PIXEL'));
    expect(ROOF_LAYOUT_PANEL_AREA_M2).toBe(readBackendExport('ROOF_LAYOUT_PANEL_AREA_M2'));
    expect(ROOF_LAYOUT_PANEL_SPACING_FACTOR).toBe(
      readBackendExport('ROOF_LAYOUT_PANEL_SPACING_FACTOR'),
    );
    expect(ROOF_LAYOUT_USABLE_AREA_FACTOR).toBe(readBackendExport('ROOF_LAYOUT_USABLE_AREA_FACTOR'));
    expect(ROOF_LAYOUT_SEED_POLYGON_ASPECT).toBe(readBackendExport('ROOF_LAYOUT_SEED_POLYGON_ASPECT'));
    expect(ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX).toBe(
      readBackendExport('ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX'),
    );
    expect(ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX).toBe(
      readBackendExport('ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX'),
    );
  });
});
