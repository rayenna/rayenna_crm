/**
 * Regression: custom-section editor popovers must stay high-contrast in Dark Mode.
 * Portaled menus used to remap to dark surfaces with light hover + white text.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('pe-editor-popover dark-mode contrast', () => {
  it('excludes pe-editor-popover from dark @scope remaps', () => {
    expect(css).toMatch(
      /@scope\s*\(\[data-theme='dark'\]\)\s*to\s*\([^)]*\.pe-editor-popover[^)]*\)/,
    );
  });

  it('forces light panel and dark text with important overrides', () => {
    expect(css).toMatch(/\.pe-editor-popover\s*\{[\s\S]*?background-color:\s*#ffffff\s*!important/);
    expect(css).toMatch(/\.pe-editor-popover-item\s*\{[\s\S]*?color:\s*#1e293b\s*!important/);
    expect(css).toMatch(
      /\.pe-editor-popover-item:hover[\s\S]*?background-color:\s*#e0e7ff\s*!important/,
    );
    expect(css).toMatch(/\.pe-editor-table-cell\.is-selected[\s\S]*?background-color:\s*#4f46e5\s*!important/);
  });

  it('adds dark-theme-specific light overrides', () => {
    expect(css).toMatch(
      /\[data-theme='dark'\]\s*\.pe-editor-popover\s*\{[\s\S]*?background-color:\s*#ffffff\s*!important/,
    );
    expect(css).toMatch(
      /\[data-theme='dark'\]\s*\.pe-editor-popover-item:hover[\s\S]*?color:\s*#1e1b4b\s*!important/,
    );
  });
});
