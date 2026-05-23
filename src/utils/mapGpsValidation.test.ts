import { describe, expect, it } from 'vitest';
import { getKeralaMapGpsWarning } from './mapGpsValidation';

describe('getKeralaMapGpsWarning', () => {
  it('warns for Kerala lat with longitude west of 76°', () => {
    expect(getKeralaMapGpsWarning(9.940753, 75.300899)).toMatch(/longitude 75\.3009/);
  });

  it('does not warn for typical Kerala longitude', () => {
    expect(getKeralaMapGpsWarning(10.0212039, 76.2729838)).toBeNull();
  });

  it('does not warn outside Kerala latitude band', () => {
    expect(getKeralaMapGpsWarning(28.6, 75.3)).toBeNull();
  });
});
