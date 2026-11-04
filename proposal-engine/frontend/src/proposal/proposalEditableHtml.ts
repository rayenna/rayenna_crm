export function extractTextOverrides(root: HTMLElement): Record<string, string> {
  const overrides: Record<string, string> = {};

  // Collect all elements tagged with data-docx-section
  const sections = root.querySelectorAll<HTMLElement>('[data-docx-section]');
  sections.forEach((el) => {
    const key = el.getAttribute('data-docx-section');
    if (!key) return;

    // Check if this section contains list items (ListBlock pattern)
    const listTexts = el.querySelectorAll<HTMLElement>('[data-docx-list-text]');
    if (listTexts.length > 0) {
      // Join each item's text with newline — buildDocx splits on '\n' to rebuild list
      overrides[key] = Array.from(listTexts)
        .map((span) => span.innerText.trim())
        .filter(Boolean)
        .join('\n');
    } else {
      // Plain text / paragraph section
      overrides[key] = el.innerText.trim();
    }
  });

  return overrides;
}

/** Parse overrides from an HTML snapshot string (safe after React remounts wipe live DOM). */
export function extractTextOverridesFromHtml(html: string): Record<string, string> {
  if (!html.trim()) return {};
  const doc = new DOMParser().parseFromString(`<div id="pe-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('pe-root');
  if (!root) return {};
  return extractTextOverrides(root);
}

export function mergeProposalEditableInnerHtml(top: HTMLElement | null, bottom: HTMLElement | null): string {
  return `${top?.innerHTML ?? ''}${bottom?.innerHTML ?? ''}`;
}

export function extractMergedProposalTextOverrides(
  top: HTMLElement | null,
  bottom: HTMLElement | null,
): Record<string, string> {
  return {
    ...(top ? extractTextOverrides(top) : {}),
    ...(bottom ? extractTextOverrides(bottom) : {}),
  };
}

/** Snapshot live editable roots before any setState — React remounts can wipe contentEditable. */
export function snapshotProposalEditableDom(
  top: HTMLElement | null,
  bottom: HTMLElement | null,
): { html: string; textOverrides: Record<string, string> } {
  const html = mergeProposalEditableInnerHtml(top, bottom);
  return {
    html,
    textOverrides: extractTextOverridesFromHtml(html),
  };
}
