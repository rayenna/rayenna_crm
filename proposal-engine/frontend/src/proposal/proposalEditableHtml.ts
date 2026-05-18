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
