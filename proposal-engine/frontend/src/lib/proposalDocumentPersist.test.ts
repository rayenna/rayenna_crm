import { describe, expect, it } from 'vitest';
import { restoreProposalDocumentFields } from './proposalDocumentPersist';

describe('restoreProposalDocumentFields', () => {
  it('returns empty document fields when nothing is saved', () => {
    expect(restoreProposalDocumentFields(null)).toEqual({
      textOverrides: {},
      bomComments: {},
      customSectionsBeforeBoq: [],
    });
  });

  it('restores BOM notes and custom sections with text overrides', () => {
    const doc = restoreProposalDocumentFields({
      textOverrides: { 'about-p1': 'Edited about' },
      bomComments: { modules: 'Use DCR panels' },
      customSectionsBeforeBoq: [
        { id: 's1', title: 'Site photos', bodyHtml: '<p>Photo note</p>' },
      ],
      editedHtml: undefined,
    });
    expect(doc.textOverrides['about-p1']).toBe('Edited about');
    expect(doc.bomComments).toEqual({ modules: 'Use DCR panels' });
    expect(doc.customSectionsBeforeBoq).toHaveLength(1);
    expect(doc.customSectionsBeforeBoq[0]?.title).toBe('Site photos');
    expect(doc.customSectionsBeforeBoq[0]?.id).toBe('s1');
  });
});
