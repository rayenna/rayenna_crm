import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import * as backend from './roofLayoutScale';

const PE_CONSTANTS_PATH = join(
  __dirname,
  '../../proposal-engine/frontend/src/lib/roofLayoutConstants.ts',
);

function readPeExport(name: string): number {
  const src = readFileSync(PE_CONSTANTS_PATH, 'utf8');
  const literal = src.match(new RegExp(`export const ${name} = ([0-9.]+)`));
  if (literal) return Number(literal[1]);
  if (name === 'ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX') {
    return readPeExport('ROOF_LAYOUT_SATELLITE_IMAGE_PX') / 2;
  }
  throw new Error(`Missing PE export: ${name}`);
}

describe('roofLayoutScale PE parity', () => {
  it('core scale constants match proposal-engine roofLayoutConstants.ts', () => {
    expect(readPeExport('ROOF_LAYOUT_METERS_PER_PIXEL')).toBe(backend.ROOF_LAYOUT_METERS_PER_PIXEL);
    expect(readPeExport('ROOF_LAYOUT_PANEL_AREA_M2')).toBe(backend.ROOF_LAYOUT_PANEL_AREA_M2);
    expect(readPeExport('ROOF_LAYOUT_PANEL_SPACING_FACTOR')).toBe(
      backend.ROOF_LAYOUT_PANEL_SPACING_FACTOR,
    );
    expect(readPeExport('ROOF_LAYOUT_USABLE_AREA_FACTOR')).toBe(
      backend.ROOF_LAYOUT_USABLE_AREA_FACTOR,
    );
    expect(readPeExport('ROOF_LAYOUT_SEED_POLYGON_ASPECT')).toBe(
      backend.ROOF_LAYOUT_SEED_POLYGON_ASPECT,
    );
    expect(readPeExport('ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX')).toBe(
      backend.ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX,
    );
    expect(readPeExport('ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX')).toBe(
      backend.ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX,
    );
  });
});
