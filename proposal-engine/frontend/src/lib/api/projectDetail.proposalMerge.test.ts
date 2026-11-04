import { describe, expect, it } from 'vitest';
import {
  mergeProposalArtifactPreservingDocumentFields,
  mergeProposalArtifactPreferringServerDocument,
} from './projectDetail';
import type { ProposalArtifact } from '../customerStore';

function fullProposal(over: Partial<ProposalArtifact> = {}): ProposalArtifact {
  return {
    refNumber: 'REY/2026/07/PRJ-0132/CUST-IMR366',
    generatedAt: '2026-07-01T00:00:00.000Z',
    summary: 'Full',
    bomComments: { modules: 'Note kept' },
    editedHtml: '<p data-docx-section="about-p1">Edited about</p>',
    textOverrides: { 'about-p1': 'Edited about' },
    customSectionsBeforeBoq: [{ id: 's1', title: 'Extra', bodyHtml: '<p>Body</p>' }],
    proposalView: { customer: { name: 'BIJU KG' } },
    includeRoofLayout: false,
    roofLayout: null,
    ...over,
  };
}

function lightProposal(): ProposalArtifact {
  return {
    refNumber: 'REY/2026/07/PRJ-0132/CUST-IMR366',
    generatedAt: '2026-07-01T00:00:00.000Z',
    summary: 'Light summary',
    includeRoofLayout: true,
    roofLayout: null,
  };
}

describe('mergeProposalArtifactPreservingDocumentFields', () => {
  it('keeps local edits when API returns a light proposal stub', () => {
    const existing = fullProposal();
    const merged = mergeProposalArtifactPreservingDocumentFields(existing, lightProposal());
    expect(merged?.textOverrides).toEqual({ 'about-p1': 'Edited about' });
    expect(merged?.bomComments).toEqual({ modules: 'Note kept' });
    expect(merged?.editedHtml).toContain('Edited about');
    expect(merged?.customSectionsBeforeBoq?.[0]?.title).toBe('Extra');
    expect(merged?.proposalView).toEqual({ customer: { name: 'BIJU KG' } });
    expect(merged?.summary).toBe('Light summary');
    expect(merged?.includeRoofLayout).toBe(true);
  });

  it('lets local textOverrides win over a stale full GET (hydrate race)', () => {
    const existing = fullProposal({
      textOverrides: { 'about-p1': 'Local just saved' },
      bomComments: { modules: 'Local note' },
    });
    const fromApi = fullProposal({
      textOverrides: { 'about-p1': 'Stale server' },
      bomComments: { modules: 'Server note' },
      summary: 'From server',
    });
    const merged = mergeProposalArtifactPreservingDocumentFields(existing, fromApi);
    expect(merged?.textOverrides).toEqual({ 'about-p1': 'Local just saved' });
    expect(merged?.bomComments).toEqual({ modules: 'Local note' });
    expect(merged?.summary).toBe('From server');
  });

  it('fills local gaps from a full server payload on a fresh device', () => {
    const existing = fullProposal({
      textOverrides: undefined,
      bomComments: undefined,
      editedHtml: undefined,
      customSectionsBeforeBoq: undefined,
      proposalView: undefined,
    });
    const fromApi = fullProposal({
      textOverrides: { 'about-p1': 'From server' },
      bomComments: { modules: 'Server note' },
    });
    const merged = mergeProposalArtifactPreservingDocumentFields(existing, fromApi);
    expect(merged?.textOverrides).toEqual({ 'about-p1': 'From server' });
    expect(merged?.bomComments).toEqual({ modules: 'Server note' });
  });

  it('returns API proposal when there is no local proposal yet', () => {
    const fromApi = lightProposal();
    expect(mergeProposalArtifactPreservingDocumentFields(null, fromApi)).toEqual(fromApi);
  });
});

describe('mergeProposalArtifactPreferringServerDocument', () => {
  it('lets a full server document replace stale local edits on Proposal open', () => {
    const existing = fullProposal({
      textOverrides: { 'about-p1': 'Stale local' },
      bomComments: { modules: 'Stale note' },
    });
    const fromApi = fullProposal({
      textOverrides: { 'about-p1': 'Saved on server' },
      bomComments: { modules: 'Server note' },
    });
    const merged = mergeProposalArtifactPreferringServerDocument(existing, fromApi);
    expect(merged?.textOverrides?.['about-p1']).toBe('Saved on server');
    expect(merged?.bomComments).toEqual({ modules: 'Server note' });
  });

  it('keeps local document blobs when the API payload is light', () => {
    const existing = fullProposal();
    const merged = mergeProposalArtifactPreferringServerDocument(existing, lightProposal());
    expect(merged?.textOverrides?.['about-p1']).toBe('Edited about');
    expect(merged?.includeRoofLayout).toBe(true);
  });
});
