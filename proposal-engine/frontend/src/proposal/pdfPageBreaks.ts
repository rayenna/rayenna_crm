import type { ReorderableSectionId } from './sectionOrder';

/**
 * Body sections that must open on a fresh PDF page.
 *
 * The break is applied on the `.pdf-section-unit` wrapper via
 * `data-pdf-break-before="page"` — NEVER on the inner `[data-pdf-section]`.
 * Inner breaks leave the leading Divider alone on a blank sheet (Chromium).
 *
 * Rules:
 * - Add an id here only when a corporate client PDF truly needs a hard page start.
 * - Do not also set break-after:page on the previous section (double blank pages).
 * - Keep PROPOSAL_PRINT_CSS in sync: only `.pdf-section-unit[data-pdf-break-before="page"]`
 *   may use break-before:page for body sections.
 */
export const PDF_BREAK_BEFORE_PAGE = new Set<ReorderableSectionId>([
  'bom',
  'closing-note',
]);

export function sectionBreaksBeforePage(id: ReorderableSectionId): boolean {
  return PDF_BREAK_BEFORE_PAGE.has(id);
}
