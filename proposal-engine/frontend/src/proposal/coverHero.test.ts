/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import {
  COVER_HERO_OVERLAY_OPACITY,
  COVER_HERO_SRC,
  stripEmptyPrintWrappers,
} from './coverHero';

describe('coverHero', () => {
  it('uses a strong enough wash for bright hero regions (WhatsApp-safe bake)', () => {
    expect(COVER_HERO_SRC).toBe('/proposal_cover_hero.jpg');
    expect(COVER_HERO_OVERLAY_OPACITY).toBeGreaterThanOrEqual(0.65);
  });

  it('stripEmptyPrintWrappers removes leaf-empty divs without section markers', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div data-pdf-section="cover"><img alt="" /></div>
      <div></div>
      <div><span> </span></div>
      <div data-pdf-keep="divider"><div></div></div>
    `;
    stripEmptyPrintWrappers(root);
    expect(root.querySelector('[data-pdf-section="cover"]')).toBeTruthy();
    expect(root.querySelector('[data-pdf-keep="divider"]')).toBeTruthy();
    // Empty anonymous wrappers removed
    const plainDivs = Array.from(root.children).filter(
      (el) =>
        el instanceof HTMLElement &&
        !el.hasAttribute('data-pdf-section') &&
        !el.hasAttribute('data-pdf-keep'),
    );
    expect(plainDivs.every((el) => (el.textContent ?? '').trim().length > 0 || el.children.length > 0)).toBe(
      true,
    );
  });
});
