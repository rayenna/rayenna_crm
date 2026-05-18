/** Font family / size helpers for custom-section rich text (contentEditable). */

export const EDITOR_FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
] as const;

export const EDITOR_FONT_SIZES = [
  { label: '8pt', value: '8pt' },
  { label: '10pt', value: '10pt' },
  { label: '11pt', value: '11pt' },
  { label: '12pt', value: '12pt' },
  { label: '14pt', value: '14pt' },
  { label: '16pt', value: '16pt' },
  { label: '18pt', value: '18pt' },
  { label: '20pt', value: '20pt' },
  { label: '24pt', value: '24pt' },
  { label: '28pt', value: '28pt' },
  { label: '36pt', value: '36pt' },
] as const;

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
]);

function primaryFamilyName(raw: string): string {
  const first = raw.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  return first.toLowerCase();
}

/** Map computed or inline font-family to a toolbar option value. */
export function matchFontFamilyValue(raw: string): string {
  if (!raw?.trim()) return '';
  const primary = primaryFamilyName(raw);
  if (!primary || GENERIC_FAMILIES.has(primary)) return '';

  for (const f of EDITOR_FONT_FAMILIES) {
    const optPrimary = primaryFamilyName(f.value);
    if (primary === optPrimary || primary === f.label.toLowerCase()) return f.value;
    if (primary.includes(optPrimary) || optPrimary.includes(primary)) return f.value;
  }
  return '';
}

/** Map px/rem/pt font-size to nearest toolbar pt value. */
export function matchFontSizeValue(raw: string): string {
  if (!raw?.trim()) return '';
  const t = raw.trim().toLowerCase();
  if (t.endsWith('pt')) {
    const exact = EDITOR_FONT_SIZES.find((s) => s.value === t);
    return exact?.value ?? '';
  }

  let px = parseFloat(t);
  if (t.endsWith('rem')) px *= 16;
  else if (!t.endsWith('px') && Number.isFinite(px) && px < 8) {
    /* bare number from Word sometimes means pt */
    const asPt = EDITOR_FONT_SIZES.find((s) => parseFloat(s.value) === px);
    if (asPt) return asPt.value;
  }
  if (!Number.isFinite(px) || px <= 0) return '';

  const pt = (px * 72) / 96;
  let best = '';
  let bestDiff = Infinity;
  for (const s of EDITOR_FONT_SIZES) {
    const optPt = parseFloat(s.value);
    const diff = Math.abs(optPt - pt);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s.value;
    }
  }
  return bestDiff <= 4 ? best : '';
}

function isRangeInEditor(range: Range, editor: HTMLElement): boolean {
  const node = range.commonAncestorContainer;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  return !!el && editor.contains(el);
}

interface TextSlice {
  node: Text;
  start: number;
  end: number;
}

function collectTextSlicesInRange(range: Range, editor: HTMLElement): TextSlice[] {
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(
    root.nodeType === Node.ELEMENT_NODE ? root : root.parentNode ?? editor,
    NodeFilter.SHOW_TEXT,
  );
  const slices: TextSlice[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const text = n as Text;
    if (!text.data.length || !editor.contains(text)) continue;
    if (typeof range.intersectsNode === 'function' && !range.intersectsNode(text)) continue;

    let start = 0;
    let end = text.length;
    if (range.startContainer === text) start = range.startOffset;
    if (range.endContainer === text) end = range.endOffset;
    if (start >= end) continue;
    slices.push({ node: text, start, end });
  }
  return slices;
}

function typographyFromElement(el: HTMLElement): { fontFamily: string; fontSize: string } {
  let cur: HTMLElement | null = el;
  let fontFamily = '';
  let fontSize = '';

  while (cur) {
    if (!fontFamily && cur.style.fontFamily) {
      fontFamily = matchFontFamilyValue(cur.style.fontFamily);
    }
    if (!fontSize && cur.style.fontSize) {
      fontSize = matchFontSizeValue(cur.style.fontSize);
    }
    if (fontFamily && fontSize) break;
    cur = cur.parentElement;
  }

  const computed = window.getComputedStyle(el);
  if (!fontFamily) fontFamily = matchFontFamilyValue(computed.fontFamily);
  if (!fontSize) fontSize = matchFontSizeValue(computed.fontSize);

  return { fontFamily, fontSize };
}

/** Current font at caret / selection (empty string = mixed or default). */
export function getSelectionTypography(editor: HTMLElement): {
  fontFamily: string;
  fontSize: string;
} {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { fontFamily: '', fontSize: '' };

  const range = sel.getRangeAt(0);
  if (!isRangeInEditor(range, editor)) return { fontFamily: '', fontSize: '' };

  if (!range.collapsed) {
    const slices = collectTextSlicesInRange(range, editor);
    const families = new Set<string>();
    const sizes = new Set<string>();
    for (const { node, start, end } of slices) {
      if (start === end) continue;
      const el = node.parentElement;
      if (!el) continue;
      const t = typographyFromElement(el);
      if (t.fontFamily) families.add(t.fontFamily);
      if (t.fontSize) sizes.add(t.fontSize);
    }
    return {
      fontFamily: families.size === 1 ? [...families][0]! : '',
      fontSize: sizes.size === 1 ? [...sizes][0]! : '',
    };
  }

  let node: Node | null = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!(node instanceof HTMLElement) || !editor.contains(node)) {
    return { fontFamily: '', fontSize: '' };
  }
  return typographyFromElement(node);
}

function wrapTextSlice(slice: TextSlice, property: string, value: string): void {
  const { node, start, end } = slice;
  if (start === 0 && end === node.length) {
    const parent = node.parentElement;
    if (
      parent?.tagName === 'SPAN' &&
      parent.childNodes.length === 1 &&
      parent.firstChild === node
    ) {
      parent.style.setProperty(property, value);
      return;
    }
    const span = document.createElement('span');
    span.style.setProperty(property, value);
    node.parentNode?.insertBefore(span, node);
    span.appendChild(node);
    return;
  }

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const span = document.createElement('span');
  span.style.setProperty(property, value);
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
}

function applyPendingTypography(
  editor: HTMLElement,
  range: Range,
  property: string,
  value: string,
): void {
  const span = document.createElement('span');
  span.style.setProperty(property, value);
  const marker = document.createTextNode('\u200B');
  span.appendChild(marker);
  range.insertNode(span);
  const sel = window.getSelection();
  if (sel) {
    const r = document.createRange();
    r.setStart(marker, 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  void editor;
}

/** Apply font-family to selection — works across pasted Word/Google HTML. */
export function applyFontFamily(editor: HTMLElement, familyValue: string): void {
  applyTypography(editor, 'font-family', familyValue);
}

/** Apply font-size to selection. */
export function applyFontSize(editor: HTMLElement, sizeValue: string): void {
  applyTypography(editor, 'font-size', sizeValue);
}

function applyTypography(editor: HTMLElement, property: string, value: string): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!isRangeInEditor(range, editor)) return;

  if (range.collapsed) {
    applyPendingTypography(editor, range, property, value);
    return;
  }

  const slices = collectTextSlicesInRange(range, editor);
  if (slices.length === 0) {
    try {
      const span = document.createElement('span');
      span.style.setProperty(property, value);
      span.appendChild(range.extractContents());
      range.insertNode(span);
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(nr);
    } catch {
      if (property === 'font-family') {
        document.execCommand('styleWithCSS', false, 'true');
        const label =
          EDITOR_FONT_FAMILIES.find((f) => f.value === value)?.label ?? value.split(',')[0] ?? value;
        document.execCommand('fontName', false, label.replace(/['"]/g, ''));
        document.execCommand('styleWithCSS', false, 'false');
      }
    }
    return;
  }

  for (const slice of slices) {
    wrapTextSlice(slice, property, value);
  }

  if (slices.length > 0) {
    const first = slices[0]!;
    const last = slices[slices.length - 1]!;
    const nr = document.createRange();
    nr.setStart(first.node, first.start);
    nr.setEnd(last.node, last.end);
    sel.removeAllRanges();
    sel.addRange(nr);
  }
}

/** Normalize pasted HTML so toolbar fonts apply cleanly (in-memory container). */
export function normalizePastedEditorTypography(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.style.fontFamily) {
      const matched = matchFontFamilyValue(el.style.fontFamily);
      if (matched) el.style.fontFamily = matched;
      else el.style.removeProperty('font-family');
    }
    if (el.style.fontSize) {
      const matched = matchFontSizeValue(el.style.fontSize);
      if (matched) el.style.fontSize = matched;
      else el.style.removeProperty('font-size');
    }
  });
}
