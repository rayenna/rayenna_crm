import { describe, expect, it } from 'vitest';
import {
  defaultSectionOrder,
  moveSection,
  normalizeSectionOrder,
  REORDERABLE_SECTION_IDS,
} from './sectionOrder';

describe('normalizeSectionOrder', () => {
  it('returns default order for null/empty', () => {
    expect(normalizeSectionOrder(null)).toEqual(defaultSectionOrder());
    expect(normalizeSectionOrder([])).toEqual(defaultSectionOrder());
  });

  it('keeps known ids and drops unknowns', () => {
    const out = normalizeSectionOrder(['bom', 'not-a-section', 'commercials']);
    expect(out[0]).toBe('bom');
    expect(out[1]).toBe('commercials');
    expect(out).not.toContain('not-a-section');
    expect(out).toHaveLength(REORDERABLE_SECTION_IDS.length);
  });

  it('appends missing catalog ids after user order', () => {
    const out = normalizeSectionOrder(['closing-note', 'about-rayenna']);
    expect(out[0]).toBe('closing-note');
    expect(out[1]).toBe('about-rayenna');
    expect(out).toContain('financial-benefits');
  });

  it('dedupes repeated ids', () => {
    const out = normalizeSectionOrder(['bom', 'bom', 'commercials']);
    expect(out.filter((id) => id === 'bom')).toHaveLength(1);
  });
});

describe('moveSection', () => {
  it('moves a section up and down', () => {
    const base = defaultSectionOrder();
    const aboutIdx = base.indexOf('about-rayenna');
    const down = moveSection(base, 'about-rayenna', 'down');
    expect(down[aboutIdx + 1]).toBe('about-rayenna');
    expect(down[aboutIdx]).toBe(base[aboutIdx + 1]);

    const up = moveSection(down, 'about-rayenna', 'up');
    expect(up).toEqual(base);
  });

  it('no-ops at the ends', () => {
    const base = defaultSectionOrder();
    const first = base[0];
    const last = base[base.length - 1];
    expect(moveSection(base, first, 'up')).toEqual(base);
    expect(moveSection(base, last, 'down')).toEqual(base);
  });

  it('can move commercials before about-rayenna for export order smoke', () => {
    let order = defaultSectionOrder();
    const aboutIdx = order.indexOf('about-rayenna');
    const commercialsIdx = order.indexOf('commercials');
    expect(commercialsIdx).toBeGreaterThan(aboutIdx);
    // Move commercials up until it sits before about
    while (order.indexOf('commercials') > order.indexOf('about-rayenna')) {
      order = moveSection(order, 'commercials', 'up');
    }
    expect(order.indexOf('commercials')).toBeLessThan(order.indexOf('about-rayenna'));
  });
});
