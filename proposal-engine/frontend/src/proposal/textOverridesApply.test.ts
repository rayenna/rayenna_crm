import { describe, expect, it } from 'vitest';
import { ov, ovLines, resolveScopeSectionsForExport } from './textOverridesApply';

describe('ov / ovLines', () => {
  it('prefers non-empty overrides', () => {
    expect(ov({ 'financial-hero': 'Edited hero copy' }, 'financial-hero', 'fallback')).toBe(
      'Edited hero copy',
    );
    expect(ov({}, 'financial-hero', 'fallback')).toBe('fallback');
    expect(ov({ 'financial-hero': '   ' }, 'financial-hero', 'fallback')).toBe('fallback');
  });

  it('splits list overrides on newlines', () => {
    expect(
      ovLines(
        { 'scope-section-1': 'Solar PV modules\nCustom hybrid inverter(s)\nMounting structure' },
        'scope-section-1',
        ['stock'],
      ),
    ).toEqual(['Solar PV modules', 'Custom hybrid inverter(s)', 'Mounting structure']);
  });
});

describe('resolveScopeSectionsForExport', () => {
  it('applies edited scope title and bullets for DOCX/PPT', () => {
    const sections = resolveScopeSectionsForExport('HYBRID', {
      'scope-section-1-title': '2. Supply of Equipment (edited)',
      'scope-section-1':
        'Solar PV modules (as per BOM)\nCustom hybrid inverter(s)\nMounting structure (GP)',
    });
    const supply = sections[1];
    expect(supply.title).toBe('2. Supply of Equipment (edited)');
    expect(supply.items).toContain('Custom hybrid inverter(s)');
    expect(supply.items).not.toContain('On-grid string inverter(s)');
    expect(supply.items).not.toContain('Hybrid inverter(s)');
  });

  it('falls back to CRM system-type inverter wording when no list override', () => {
    const sections = resolveScopeSectionsForExport('HYBRID', {
      'financial-hero': 'Edited financial hero for export smoke',
    });
    expect(sections[1].items).toContain('Hybrid inverter(s)');
  });
});
