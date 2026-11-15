import { describe, expect, it } from 'vitest';
import React from 'react';
import { WHAT_WE_OFFER_INTRO } from './proposalCopy';
import { systemTypeDiagramSrc } from './systemTypeLabel';
import { ov } from './textOverridesApply';

/**
 * plainTextFromNode lives in ProposalDocumentBlocks (not exported).
 * Mirror the contract here: stock What We Offer intro must resolve as a
 * plain string for EditableText when no override is saved.
 */
function plainTextFromNode(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainTextFromNode).join('');
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (el.type === 'br') return '\n';
    return plainTextFromNode(el.props?.children);
  }
  return '';
}

describe('What We Offer intro is system-type invariant', () => {
  it('keeps the same stock description for On-Grid, Hybrid, and Off-Grid', () => {
    expect(WHAT_WE_OFFER_INTRO).toMatch(/We at Rayenna understand/);
    expect(WHAT_WE_OFFER_INTRO).toMatch(/top-grade components/);
    // Diagram path changes; copy constant does not.
    expect(systemTypeDiagramSrc('ON_GRID')).not.toBe(systemTypeDiagramSrc('HYBRID'));
    expect(systemTypeDiagramSrc('HYBRID')).not.toBe(systemTypeDiagramSrc('OFF_GRID'));
  });

  it('resolves intro from string children (not empty span-only trees)', () => {
    expect(plainTextFromNode(WHAT_WE_OFFER_INTRO)).toBe(WHAT_WE_OFFER_INTRO);
    // Legacy span-wrapped paragraphs must still extract text if present.
    const legacy = [
      React.createElement('span', { key: 'a' }, 'We at Rayenna understand'),
      React.createElement('span', { key: 'b' }, [
        React.createElement('br', { key: 'br1' }),
        React.createElement('br', { key: 'br2' }),
        'top-grade components',
      ]),
    ];
    const extracted = plainTextFromNode(legacy);
    expect(extracted).toContain('We at Rayenna understand');
    expect(extracted).toContain('top-grade components');
  });

  it('DOCX/PPT ov() falls back to full shared intro when override missing or blank', () => {
    expect(ov(undefined, 'what-we-offer-intro', WHAT_WE_OFFER_INTRO)).toBe(WHAT_WE_OFFER_INTRO);
    expect(ov({ 'what-we-offer-intro': '   ' }, 'what-we-offer-intro', WHAT_WE_OFFER_INTRO)).toBe(
      WHAT_WE_OFFER_INTRO,
    );
    expect(
      ov({ 'what-we-offer-intro': 'Custom intro' }, 'what-we-offer-intro', WHAT_WE_OFFER_INTRO),
    ).toBe('Custom intro');
  });
});
