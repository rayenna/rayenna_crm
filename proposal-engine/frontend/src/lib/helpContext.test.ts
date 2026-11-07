import { describe, expect, it } from 'vitest';
import {
  HELP_ANCHORS,
  helpLabelForRoute,
  helpPathForPreflightFinding,
  helpPathForRoute,
} from './helpContext';

describe('helpPathForRoute', () => {
  it('maps workflow pages to Help anchors', () => {
    expect(helpPathForRoute('/costing')).toBe(`/help#${HELP_ANCHORS.costing}`);
    expect(helpPathForRoute('/bom')).toBe(`/help#${HELP_ANCHORS.bom}`);
    expect(helpPathForRoute('/roi')).toBe(`/help#${HELP_ANCHORS.roi}`);
    expect(helpPathForRoute('/ai-layout')).toBe(`/help#${HELP_ANCHORS.aiRoofLayout}`);
    expect(helpPathForRoute('/proposal')).toBe(`/help#${HELP_ANCHORS.proposal}`);
    expect(helpPathForRoute('/dashboard')).toBe(`/help#${HELP_ANCHORS.quickstart}`);
    expect(helpPathForRoute('/customers')).toBe(`/help#${HELP_ANCHORS.customers}`);
    expect(helpPathForRoute('/customers/abc')).toBe(`/help#${HELP_ANCHORS.customers}`);
  });

  it('falls back to /help for Help and About', () => {
    expect(helpPathForRoute('/help')).toBe('/help');
    expect(helpPathForRoute('/about')).toBe('/help');
  });
});

describe('helpLabelForRoute', () => {
  it('returns Guide: label for known pages', () => {
    expect(helpLabelForRoute('/costing')).toBe('Guide: Costing Sheet');
    expect(helpLabelForRoute('/help')).toBe('User Guide');
  });
});

describe('helpPathForPreflightFinding', () => {
  it('deep-links capacity choice to the capacity FAQ', () => {
    expect(helpPathForPreflightFinding('system_size_mismatch')).toBe(
      `/help#${HELP_ANCHORS.faqPreflightCapacity}`,
    );
  });

  it('deep-links missing BOM to the BOM FAQ', () => {
    expect(helpPathForPreflightFinding('missing_bom')).toBe(
      `/help#${HELP_ANCHORS.faqBomEmpty}`,
    );
  });
});
