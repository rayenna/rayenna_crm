/**
 * Full proposal document persistence — text body, BOQ notes, and custom sections
 * are one saved unit (not independent optional fragments).
 */
import type { ProposalArtifact, ProposalCustomSectionBeforeBoq } from './customerStore';
import { normalizeCustomSectionsBeforeBoq } from './proposalCustomSections';
import { extractTextOverridesFromHtml } from '../proposal/proposalEditableHtml';

export type ProposalDocumentFields = {
  textOverrides: Record<string, string | undefined>;
  bomComments: Record<string, string>;
  customSectionsBeforeBoq: ProposalCustomSectionBeforeBoq[];
  editedHtml?: string;
};

/**
 * Rebuild display fields from a saved proposal artifact.
 * `editedHtml` is the body snapshot source of truth for tagged sections;
 * structured textOverrides fill any gaps; BOM notes + custom sections come along.
 */
export function restoreProposalDocumentFields(
  saved: Pick<
    ProposalArtifact,
    'editedHtml' | 'textOverrides' | 'bomComments' | 'customSectionsBeforeBoq'
  > | null | undefined,
): ProposalDocumentFields {
  if (!saved) {
    return { textOverrides: {}, bomComments: {}, customSectionsBeforeBoq: [] };
  }
  const fromHtml = saved.editedHtml
    ? extractTextOverridesFromHtml(saved.editedHtml)
    : {};
  const textOverrides: Record<string, string | undefined> = {
    ...(saved.textOverrides ?? {}),
    ...fromHtml,
  };
  return {
    textOverrides,
    bomComments: { ...(saved.bomComments ?? {}) },
    customSectionsBeforeBoq: normalizeCustomSectionsBeforeBoq(saved.customSectionsBeforeBoq),
    editedHtml: saved.editedHtml,
  };
}
