/** Simple email shape for proposal custom-section links (not full RFC validation). */
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Normalize user input to a safe `https:` or `mailto:` href for custom sections.
 * Returns null when the value cannot be used.
 */
export function normalizeProposalEditorLinkInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  if (/^mailto:/i.test(t)) {
    const email = t.replace(/^mailto:/i, '').trim();
    return EMAIL_RE.test(email) ? `mailto:${email}` : null;
  }

  if (EMAIL_RE.test(t)) return `mailto:${t}`;

  let candidate = t;
  if (/^http:\/\//i.test(candidate)) {
    candidate = `https://${candidate.slice(7)}`;
  } else if (!/^https:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== 'https:') return null;
    if (!u.hostname || !u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function defaultProposalEditorLinkLabel(href: string): string {
  if (/^mailto:/i.test(href)) return href.replace(/^mailto:/i, '');
  try {
    const u = new URL(href);
    return u.hostname.replace(/^www\./i, '');
  } catch {
    return href;
  }
}

export function buildProposalEditorLinkHtml(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label.trim() || defaultProposalEditorLinkLabel(href));
  const targetRel =
    /^mailto:/i.test(href)
      ? ''
      : ' target="_blank" rel="noopener noreferrer"';
  return `<a href="${safeHref}"${targetRel}>${safeLabel}</a>`;
}

/** Anchor enclosing the current selection, if any. */
export function getSelectionLinkAnchor(editorEl: HTMLElement): HTMLAnchorElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  while (node && node !== editorEl) {
    if (node instanceof HTMLAnchorElement) return node;
    node = node.parentNode;
  }
  return null;
}

function selectionIsInEditor(editorEl: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const anchor = sel.anchorNode;
  if (!anchor) return false;
  const el = anchor.nodeType === Node.TEXT_NODE ? anchor.parentNode : anchor;
  return !!el && editorEl.contains(el as Node);
}

function insertHtmlAtSelection(editorEl: HTMLElement, html: string): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !selectionIsInEditor(editorEl)) {
    editorEl.insertAdjacentHTML('beforeend', html);
    return;
  }
  try {
    const ok = document.execCommand('insertHTML', false, html);
    if (ok) return;
  } catch {
    /* fall through */
  }
  try {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    range.insertNode(frag);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    editorEl.insertAdjacentHTML('beforeend', html);
  }
}

/**
 * Wrap the current selection (or insert at caret) as a hyperlink.
 * Updates an existing anchor when the caret is inside one.
 */
export function applyProposalEditorLink(
  editorEl: HTMLElement,
  rawUrl: string,
  displayText?: string,
): boolean {
  const href = normalizeProposalEditorLinkInput(rawUrl);
  if (!href) return false;

  const existing = getSelectionLinkAnchor(editorEl);
  if (existing && editorEl.contains(existing)) {
    existing.setAttribute('href', href);
    if (/^mailto:/i.test(href)) {
      existing.removeAttribute('target');
      existing.removeAttribute('rel');
    } else {
      existing.setAttribute('target', '_blank');
      existing.setAttribute('rel', 'noopener noreferrer');
    }
    const label = displayText?.trim();
    if (label) existing.textContent = label;
    return true;
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !selectionIsInEditor(editorEl)) {
    const label = displayText?.trim() || defaultProposalEditorLinkLabel(href);
    insertHtmlAtSelection(editorEl, buildProposalEditorLinkHtml(href, label));
    return true;
  }

  const range = sel.getRangeAt(0);
  const label = displayText?.trim() || (range.collapsed ? '' : range.toString().trim()) || defaultProposalEditorLinkLabel(href);

  if (range.collapsed) {
    insertHtmlAtSelection(editorEl, buildProposalEditorLinkHtml(href, label));
    return true;
  }

  try {
    const frag = range.extractContents();
    const a = document.createElement('a');
    a.setAttribute('href', href);
    if (!/^mailto:/i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    a.appendChild(frag);
    if (displayText?.trim()) a.textContent = displayText.trim();
    range.insertNode(a);
    const newRange = document.createRange();
    newRange.selectNodeContents(a);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return true;
  } catch {
    insertHtmlAtSelection(editorEl, buildProposalEditorLinkHtml(href, label));
    return true;
  }
}

/** Unwrap the anchor at the current selection. */
export function removeProposalEditorLink(editorEl: HTMLElement): boolean {
  const a = getSelectionLinkAnchor(editorEl);
  if (!a || !editorEl.contains(a)) return false;
  const parent = a.parentNode;
  if (!parent) return false;
  while (a.firstChild) parent.insertBefore(a.firstChild, a);
  parent.removeChild(a);
  return true;
}

/** Read link context for the hyperlink dialog (URL + visible text). */
export function readProposalEditorLinkContext(editorEl: HTMLElement): {
  url: string;
  text: string;
  hasLink: boolean;
} {
  const anchor = getSelectionLinkAnchor(editorEl);
  if (anchor && editorEl.contains(anchor)) {
    const href = anchor.getAttribute('href') ?? '';
    return {
      url: /^mailto:/i.test(href) ? href.replace(/^mailto:/i, '') : href,
      text: anchor.textContent ?? '',
      hasLink: true,
    };
  }

  const sel = window.getSelection();
  let text = '';
  if (sel && sel.rangeCount > 0 && selectionIsInEditor(editorEl)) {
    const range = sel.getRangeAt(0);
    if (!range.collapsed) text = range.toString();
  }

  const trimmed = text.trim();
  const asUrl = trimmed ? normalizeProposalEditorLinkInput(trimmed) : null;
  return {
    url: asUrl && /^https:/i.test(asUrl) ? trimmed : trimmed && EMAIL_RE.test(trimmed) ? trimmed : '',
    text: trimmed,
    hasLink: false,
  };
}
