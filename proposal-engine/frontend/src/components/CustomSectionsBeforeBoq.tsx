import {
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ClipboardEvent,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { ProposalCustomSectionBeforeBoq } from '../lib/customerStore';
import {
  newCustomSectionId,
  PE_MANAGED_BEFORE_BOQ,
  PE_MANAGED_SECTION_ATTR,
  youtubeEmbedFromUrl,
  isMp4MediaUrl,
} from '../lib/proposalCustomSections';
import {
  sanitizeProposalCustomBodyHtml,
  isSafeDataImageSrc,
  preCleanRichPasteHtml,
} from '../lib/sanitizeProposalCustomHtml';
import {
  applyProposalEditorLink,
  normalizeProposalEditorLinkInput,
  readProposalEditorLinkContext,
  removeProposalEditorLink,
} from '../lib/proposalEditorLink';
import {
  attachWrappedImageDrag,
  getImageWrapSide,
  imageSupportsTextWrap,
  setImageBlockAlign,
  setImageTextWrap,
  toggleImageTextWrap,
  type ImageWrapSide,
} from '../lib/proposalEditorImage';
import {
  applyFontFamily,
  applyFontSize,
  EDITOR_FONT_FAMILIES,
  EDITOR_FONT_SIZES,
  getSelectionTypography,
  normalizePastedEditorTypography,
} from '../lib/proposalEditorFont';

/**
 * Detect which Office app copied to the clipboard by scanning the HTML header.
 * Word, Excel, and PowerPoint all embed namespace / generator markers in the
 * HTML they put on the clipboard — we sniff those to route the paste correctly.
 */
function detectOfficeSource(html: string): 'word' | 'excel' | 'powerpoint' | 'other' {
  const h = html.slice(0, 3000); // only scan the preamble for speed
  if (/office:powerpoint|powerpoint\.show|MsoPresentationText/i.test(h)) return 'powerpoint';
  if (/office:excel|excel\.sheet|class=["']xl/i.test(h)) return 'excel';
  if (/office:word|word\.document|class=["']Mso/i.test(h)) return 'word';
  return 'other';
}

/**
 * Resize / JPEG-compress so pasted photos stay under sanitiser limits and save reliably.
 *
 * Target: decoded JPEG bytes < 450 KB (sanitiser MAX_IMAGE_BYTES).
 * In base64 that is ~600 KB of string; we target ≤ 560 K to leave headroom.
 * For very large or highly-detailed images (e.g. aerial/satellite photos) we
 * progressively drop quality below 0.45 and, if still too large, halve the
 * pixel dimensions until the image fits.
 */
async function compressImageFileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('decode'));
      im.src = blobUrl;
    });

    // Target base64 string length that keeps decoded bytes safely under 450 KB
    const TARGET_LEN = 560_000;

    let { width, height } = img;

    // Initial cap: images wider than 1600 px are rarely needed at full res
    const maxW = 1600;
    if (width > maxW) {
      height = Math.round((height * maxW) / width);
      width = maxW;
    }

    const drawToDataUrl = (w: number, h: number, q: number): string => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', q);
    };

    // Pass 1: reduce quality from 0.88 → 0.20 in steps
    let q = 0.88;
    let dataUrl = drawToDataUrl(width, height, q);
    while (dataUrl.length > TARGET_LEN && q > 0.20) {
      q = Math.max(0.20, q - 0.08);
      dataUrl = drawToDataUrl(width, height, q);
    }

    // Pass 2: if still too large, progressively halve pixel dimensions
    while (dataUrl.length > TARGET_LEN && width > 200) {
      width  = Math.round(width  * 0.6);
      height = Math.round(height * 0.6);
      dataUrl = drawToDataUrl(width, height, q);
    }

    return isSafeDataImageSrc(dataUrl) ? dataUrl : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

const IMG_WIDTH_SM = 260;
const IMG_WIDTH_MD = 380;
const IMG_WIDTH_LG = 560;

function highlightSelectedImg(root: HTMLElement | null, img: HTMLImageElement | null): void {
  if (!root) return;
  root.querySelectorAll('img').forEach((el) => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  });
  if (img && root.contains(img)) {
    img.style.outline = '2px solid #2563eb';
    img.style.outlineOffset = '2px';
  }
}

function insertHtmlIntoCaret(el: HTMLElement, html: string): void {
  // Only focus if not already active. When called from inside onFormat(),
  // the element is already focused and the correct selection range has been
  // restored. A redundant focus() would fire selectionchange and overwrite
  // that restored range before we can use it.
  if (document.activeElement !== el) el.focus();
  try {
    // On Android Chrome, execCommand('insertHTML') returns false silently
    // (it does NOT throw). We must check the return value and fall through
    // to the Range API so the table / HTML is actually inserted.
    const ok = document.execCommand('insertHTML', false, html);
    if (ok) return;
  } catch {
    /* fall through */
  }
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const anchor = sel.anchorNode;
    const contained =
      anchor &&
      el.contains(anchor.nodeType === Node.TEXT_NODE ? (anchor.parentNode as Node) : anchor);
    if (contained) {
      try {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = range.createContextualFragment(html);
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      } catch {
        /* fall through */
      }
    }
  }
  el.insertAdjacentHTML('beforeend', html);
}

// ─── Toolbar constants ────────────────────────────────────────────────────────

// ─── Color palettes ────────────────────────────────────────────────────────────

const FONT_COLORS = [
  '#000000', '#1e293b', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f1f5f9', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#0d9488', '#0891b2',
  '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#be123c',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fde68a', '#fbcfe8', '#ddd6fe',
  '#fed7aa', '#a7f3d0', '#c7d2fe', '#fecaca', '#d1fae5', '#e0e7ff',
];

// ─── Table border presets ─────────────────────────────────────────────────────

function tableSetBorders(ctx: TableContext, preset: 'all' | 'none' | 'outer' | 'inner'): void {
  const { table } = ctx;
  const BORDER = '1px solid #94a3b8';
  const totalRows = table.rows.length;
  Array.from(table.rows).forEach((row, rowIdx) => {
    const totalCols = row.cells.length;
    Array.from(row.cells).forEach((cell, colIdx) => {
      const isTop    = rowIdx === 0;
      const isBottom = rowIdx === totalRows - 1;
      const isLeft   = colIdx === 0;
      const isRight  = colIdx === totalCols - 1;
      switch (preset) {
        case 'all':   cell.style.border = BORDER; break;
        case 'none':  cell.style.border = 'none'; break;
        case 'outer':
          cell.style.borderTop    = isTop    ? BORDER : 'none';
          cell.style.borderBottom = isBottom ? BORDER : 'none';
          cell.style.borderLeft   = isLeft   ? BORDER : 'none';
          cell.style.borderRight  = isRight  ? BORDER : 'none';
          break;
        case 'inner':
          cell.style.borderTop    = !isTop    ? BORDER : 'none';
          cell.style.borderBottom = !isBottom ? BORDER : 'none';
          cell.style.borderLeft   = !isLeft   ? BORDER : 'none';
          cell.style.borderRight  = !isRight  ? BORDER : 'none';
          break;
      }
    });
  });
}

function makeTable(rows: number, cols: number): string {
  const cellStyle = 'border:1px solid #cbd5e1;padding:6px 10px;text-align:left;';
  const thStyle   = cellStyle + 'background:#f1f5f9;';
  const thCells   = Array.from({ length: cols }, () => `<th style="${thStyle}">&nbsp;</th>`).join('');
  const tdCells   = Array.from({ length: cols }, () => `<td style="${cellStyle}">&nbsp;</td>`).join('');
  const headerRow = `<tr>${thCells}</tr>`;
  const bodyRows  = Array.from({ length: Math.max(1, rows - 1) }, () => `<tr>${tdCells}</tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table><p><br/></p>`;
}

// ─── Table context (cursor position inside a table) ────────────────────────────

interface TableContext {
  table:    HTMLTableElement;
  row:      HTMLTableRowElement;
  cell:     HTMLTableCellElement;
  colIndex: number;
}

function getTableContext(editorEl: HTMLElement): TableContext | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  let cell: HTMLTableCellElement | null = null;
  let row:  HTMLTableRowElement  | null = null;
  let table: HTMLTableElement    | null = null;
  while (node && node !== editorEl) {
    if (node instanceof HTMLElement) {
      const tag = node.tagName;
      if (!cell  && (tag === 'TD' || tag === 'TH')) cell  = node as HTMLTableCellElement;
      if (!row   && tag === 'TR')                   row   = node as HTMLTableRowElement;
      if (!table && tag === 'TABLE')                table = node as HTMLTableElement;
    }
    node = node.parentNode;
  }
  if (!cell || !row || !table || !editorEl.contains(table)) return null;
  const colIndex = Array.from(row.cells).indexOf(cell);
  return { table, row, cell, colIndex };
}

// ─── Table DOM operations (mutate in-place; caller must commitFromEditor) ──────

function tableInsertRow(ctx: TableContext, before: boolean): void {
  const { table, row } = ctx;
  const cols     = row.cells.length;
  const cellStyle = row.cells[0]?.style.cssText ?? 'border:1px solid #cbd5e1;padding:6px 10px;';
  const newRow   = table.insertRow(before ? row.rowIndex : row.rowIndex + 1);
  for (let i = 0; i < cols; i++) {
    const td = newRow.insertCell(i);
    td.style.cssText = cellStyle.replace(/background[^;]*;?/gi, '');
    td.innerHTML     = '&nbsp;';
  }
}

function tableDeleteRow(ctx: TableContext): void {
  const { table, row } = ctx;
  if (table.rows.length <= 1) return;
  table.deleteRow(row.rowIndex);
}

function tableInsertColumn(ctx: TableContext, before: boolean): void {
  const { table, colIndex } = ctx;
  Array.from(table.rows).forEach((row, ri) => {
    const isHeader  = ri === 0 && row.parentElement?.tagName === 'THEAD';
    const newCell   = document.createElement(isHeader ? 'th' : 'td');
    const cellStyle = 'border:1px solid #cbd5e1;padding:6px 10px;text-align:left;';
    newCell.style.cssText = isHeader ? cellStyle + 'background:#f1f5f9;' : cellStyle;
    newCell.innerHTML = '&nbsp;';
    const ref = row.cells[before ? colIndex : colIndex + 1];
    ref ? row.insertBefore(newCell, ref) : row.appendChild(newCell);
  });
}

function tableDeleteColumn(ctx: TableContext): void {
  const { table, colIndex } = ctx;
  if (table.rows[0] && table.rows[0].cells.length <= 1) return;
  Array.from(table.rows).forEach((row) => {
    const cell = row.cells[colIndex];
    if (cell) row.deleteCell(cell.cellIndex);
  });
}

function tableSetColumnWidth(ctx: TableContext, width: string): void {
  const { table, colIndex } = ctx;
  Array.from(table.rows).forEach((row) => {
    const cell = row.cells[colIndex];
    if (cell) cell.style.width = width;
  });
}

/** Wrap the current selection in a span with an inline style property. Falls back gracefully when selection is collapsed. */
function applyInlineStyle(property: string, value: string, _editorEl: HTMLElement): void {
  // Do NOT call editorEl.focus() here. onFormat() has already focused the
  // element and restored the correct selection range. A second focus() call
  // fires another selectionchange which would overwrite the restored range
  // before Range.extractContents() / insertNode() can use it.
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);

  if (range.collapsed) {
    // No text selected — apply a "pending" style via execCommand so the next
    // typed character inherits it. execCommand works for the pending-style case
    // on all browsers including Android Chrome.
    //
    // NOTE: font-weight / font-style / text-decoration MUST use their dedicated
    // execCommand verbs here; the generic styleWithCSS + insertHTML trick does
    // not activate "pending" styles for these properties on Android Chrome —
    // that was the root cause of Italic never working on mobile.
    document.execCommand('styleWithCSS', false, 'true');
    if (property === 'font-weight') {
      document.execCommand('bold', false);
    } else if (property === 'font-style') {
      document.execCommand('italic', false);
    } else if (property === 'text-decoration') {
      document.execCommand('underline', false);
    } else if (property === 'color') {
      document.execCommand('foreColor', false, value);
    } else if (property === 'background-color') {
      document.execCommand('hiliteColor', false, value);
    }
    document.execCommand('styleWithCSS', false, 'false');
    return;
  }

  // Non-collapsed selection: extract, wrap in span, re-insert.
  // Wrapped in try/catch because on Android Chrome, Range.extractContents() /
  // Range.insertNode() can throw or silently no-op when the range crosses certain
  // contentEditable boundaries. If the Range API fails, fall back to execCommand.
  try {
    const frag = range.extractContents();
    const span = document.createElement('span');
    span.style.setProperty(property, value);
    span.appendChild(frag);
    range.insertNode(span);
    // Restore selection to cover the new span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } catch {
    // Fallback for Android Chrome Range API failures
    document.execCommand('styleWithCSS', false, 'true');
    if (property === 'font-weight')         document.execCommand('bold', false);
    else if (property === 'font-style')     document.execCommand('italic', false);
    else if (property === 'text-decoration') document.execCommand('underline', false);
    else if (property === 'color')          document.execCommand('foreColor', false, value);
    else if (property === 'background-color') document.execCommand('hiliteColor', false, value);
    document.execCommand('styleWithCSS', false, 'false');
  }
}

// ─── Toolbar button helpers ────────────────────────────────────────────────────

function cmd(command: string, value?: string) {
  document.execCommand(command, false, value ?? '');
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  orderedList: boolean;
  unorderedList: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  subscript: boolean;
  superscript: boolean;
  /** Toolbar font-family option value; empty = mixed / default */
  fontFamily: string;
  /** Toolbar font-size option value (pt); empty = mixed / default */
  fontSize: string;
}

function getFormatState(): FormatState {
  return {
    bold:          document.queryCommandState('bold'),
    italic:        document.queryCommandState('italic'),
    underline:     document.queryCommandState('underline'),
    orderedList:   document.queryCommandState('insertOrderedList'),
    unorderedList: document.queryCommandState('insertUnorderedList'),
    alignLeft:     document.queryCommandState('justifyLeft'),
    alignCenter:   document.queryCommandState('justifyCenter'),
    alignRight:    document.queryCommandState('justifyRight'),
    subscript:     document.queryCommandState('subscript'),
    superscript:   document.queryCommandState('superscript'),
    fontFamily:    '',
    fontSize:      '',
  };
}

// ─── Color picker popover ──────────────────────────────────────────────────────
// Rendered via createPortal into document.body so that `overflow-x: auto` on
// the toolbar container never clips the picker in portrait / scrolled mode.

function ColorPicker({
  colors,
  onSelect,
  onClose,
  anchorRef,
  allowRemove = false,
  removeLabel = 'None',
}: {
  colors: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  allowRemove?: boolean;
  removeLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Calculate fixed position from the anchor button on mount.
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const PICKER_W = 228; // approximate picker width
    const left = Math.max(8, Math.min(
      window.innerWidth - PICKER_W - 8,
      rect.left + rect.width / 2 - PICKER_W / 2,
    ));
    setPos({ top: rect.bottom + 6, left });
  }, [anchorRef]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={wrapRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3"
      onPointerDown={(e) => e.preventDefault()}
    >
      {/* Swatches — 24px on mobile for easy tapping */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(8, 24px)' }}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            className="w-6 h-6 rounded-md border border-slate-200 active:scale-90 hover:scale-110
                       transition-transform ring-offset-1 hover:ring-2 hover:ring-slate-400
                       focus:outline-none [touch-action:manipulation]"
            style={{ background: color }}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(color); onClose(); }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="color"
            className="w-7 h-7 sm:w-6 sm:h-6 rounded border border-slate-200 cursor-pointer p-0"
            defaultValue="#000000"
            onChange={(e) => onSelect(e.target.value)}
            title="Custom colour"
          />
          <span className="text-xs sm:text-[10px] text-slate-500 font-medium">Custom</span>
        </label>
        {allowRemove && (
          <button
            type="button"
            className="text-xs sm:text-[10px] text-slate-500 hover:text-red-500 font-medium ml-auto
                       [touch-action:manipulation]"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(''); onClose(); }}
          >
            {removeLabel}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Table row×col picker popover ─────────────────────────────────────────────
// Rendered via createPortal into document.body so that `overflow-x: auto` on
// the toolbar container never clips the picker in portrait / scrolled mode.

const PICKER_MAX = 8;

function TablePicker({
  onInsert,
  onClose,
  anchorRef,
}: {
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const PICKER_W = 220;
    const left = Math.max(8, Math.min(
      window.innerWidth - PICKER_W - 8,
      rect.left + rect.width / 2 - PICKER_W / 2,
    ));
    setPos({ top: rect.bottom + 6, left });
  }, [anchorRef]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={wrapRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white border border-secondary-200 rounded-xl shadow-xl p-3 select-none"
      onPointerDown={(e) => e.preventDefault()}
    >
      <p className="text-xs font-semibold text-secondary-500 mb-2 text-center min-w-[140px]">
        {hover.r > 0 && hover.c > 0
          ? `${hover.c} col${hover.c > 1 ? 's' : ''} × ${hover.r} row${hover.r > 1 ? 's' : ''}`
          : 'Tap to choose size'}
      </p>
      {/* Cells 28px on mobile for easy tapping */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${PICKER_MAX}, 28px)` }}
      >
        {Array.from({ length: PICKER_MAX }, (_, r) =>
          Array.from({ length: PICKER_MAX }, (_, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-7 h-7 rounded border cursor-pointer transition-colors [touch-action:manipulation] ${
                r < hover.r && c < hover.c
                  ? 'bg-primary-300 border-primary-500'
                  : 'bg-secondary-100 border-secondary-300 hover:bg-primary-100 hover:border-primary-300'
              }`}
              onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
              onTouchStart={() => setHover({ r: r + 1, c: c + 1 })}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                onInsert(r + 1, c + 1);
                onClose();
              }}
            />
          )),
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Table context bar (shown when cursor is inside a table) ───────────────────

const COL_WIDTHS = [
  { label: 'Auto', value: '' },
  { label: '10%',  value: '10%' },
  { label: '20%',  value: '20%' },
  { label: '25%',  value: '25%' },
  { label: '33%',  value: '33%' },
  { label: '50%',  value: '50%' },
  { label: '75%',  value: '75%' },
  { label: '100%', value: '100%' },
];

function TableContextBar({
  ctx,
  onTableAction,
  onTableAlign,
  onTableWidth,
}: {
  ctx: TableContext;
  onTableAction: (fn: () => void) => void;
  onTableAlign: (align: 'left' | 'center' | 'right') => void;
  onTableWidth: (width: 'auto' | '33%' | '50%' | '75%' | '100%') => void;
}) {
  const ab = 'text-[11px] sm:text-[10px] font-semibold px-2.5 py-1.5 sm:py-0.5 sm:px-2 rounded-md border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 transition-colors [touch-action:manipulation]';
  const db = 'text-[11px] sm:text-[10px] font-semibold px-2.5 py-1.5 sm:py-0.5 sm:px-2 rounded-md border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors [touch-action:manipulation]';
  const sep = <span className="w-px h-5 sm:h-4 bg-indigo-200/60 flex-shrink-0 mx-0.5" />;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-indigo-50/60 border-b border-indigo-100 print-hide">
      {/* Row ops */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Row</span>
      <button type="button" className={ab} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertRow(ctx, true))}>↑ Above</button>
      <button type="button" className={ab} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertRow(ctx, false))}>↓ Below</button>
      <button type="button" className={db} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableDeleteRow(ctx))}>✕ Row</button>

      {sep}

      {/* Column ops */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Col</span>
      <button type="button" className={ab} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertColumn(ctx, true))}>← Left</button>
      <button type="button" className={ab} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertColumn(ctx, false))}>→ Right</button>
      <button type="button" className={db} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableDeleteColumn(ctx))}>✕ Col</button>

      {sep}

      {/* Column width */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Width</span>
      {COL_WIDTHS.map((w) => (
        <button key={w.label} type="button" className={ab} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableSetColumnWidth(ctx, w.value))}>
          {w.label}
        </button>
      ))}

      {sep}

      {/* Borders */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Borders</span>
      {(['all', 'outer', 'inner', 'none'] as const).map((preset) => (
        <button key={preset} type="button" className={ab} onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableSetBorders(ctx, preset))}>
          {preset.charAt(0).toUpperCase() + preset.slice(1)}
        </button>
      ))}

      {sep}

      {/* Table alignment — aligns the whole table left/centre/right within the editor */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Table align</span>
      <button
        type="button" className={ab} title="Align table left"
        onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAlign('left')}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="9" height="2" rx="1"/><rect x="0" y="9" width="12" height="2" rx="1"/></svg>
      </button>
      <button
        type="button" className={ab} title="Align table centre"
        onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAlign('center')}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="2.5" y="5" width="9" height="2" rx="1"/><rect x="1" y="9" width="12" height="2" rx="1"/></svg>
      </button>
      <button
        type="button" className={ab} title="Align table right"
        onPointerDown={(e) => e.preventDefault()} onClick={() => onTableAlign('right')}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="5" y="5" width="9" height="2" rx="1"/><rect x="2" y="9" width="12" height="2" rx="1"/></svg>
      </button>

      {sep}

      {/* Table width — set overall table width; clears per-cell pixel widths so
          columns redistribute proportionally within the chosen table width */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Table width</span>
      {([
        { label: 'Auto', value: 'auto'  as const, title: 'Fit to content'      },
        { label: '33%',  value: '33%'   as const, title: 'One-third width'     },
        { label: '50%',  value: '50%'   as const, title: 'Half width'          },
        { label: '75%',  value: '75%'   as const, title: 'Three-quarter width' },
        { label: 'Full', value: '100%'  as const, title: 'Full editor width'   },
      ]).map(({ label, value, title }) => (
        <button
          key={value} type="button" className={ab} title={title}
          onPointerDown={(e) => e.preventDefault()} onClick={() => onTableWidth(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Hyperlink dialog (mobile-first bottom sheet) ─────────────────────────────

function LinkDialog({
  open,
  initialUrl,
  initialText,
  canRemove,
  onClose,
  onApply,
  onRemove,
}: {
  open: boolean;
  initialUrl: string;
  initialText: string;
  canRemove: boolean;
  onClose: () => void;
  onApply: (url: string, text: string) => void;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setText(initialText);
    setError(null);
    const t = window.setTimeout(() => urlRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, initialUrl, initialText]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!normalizeProposalEditorLinkInput(url)) {
      setError('Enter a valid https URL or email address.');
      return;
    }
    onApply(url.trim(), text.trim());
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pe-link-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 [touch-action:manipulation]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl
                   border border-slate-200 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <div className="px-4 pt-3 pb-4 sm:px-5 sm:pt-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="pe-link-dialog-title" className="text-base font-semibold text-slate-900">
                Insert hyperlink
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Highlight text first, or leave display text blank to use the URL or email.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100
                         flex items-center justify-center [touch-action:manipulation]"
              aria-label="Close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">URL or email</span>
            <input
              ref={urlRef}
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="https://example.com or name@company.com"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-base sm:text-sm
                         text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700">Text to display (optional)</span>
            <input
              type="text"
              autoComplete="off"
              placeholder="Visible link text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-base sm:text-sm
                         text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          {error && (
            <p className="text-xs text-red-600 font-medium" role="alert">{error}</p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            {canRemove && (
              <button
                type="button"
                className="min-h-[44px] px-4 rounded-lg text-sm font-medium text-red-600
                           border border-red-200 hover:bg-red-50 [touch-action:manipulation]"
                onClick={() => { onRemove(); onClose(); }}
              >
                Remove link
              </button>
            )}
            <button
              type="button"
              className="min-h-[44px] px-4 rounded-lg text-sm font-medium text-slate-700
                         border border-slate-200 hover:bg-slate-50 [touch-action:manipulation]
                         sm:mr-auto"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-blue-600
                         hover:bg-blue-700 active:bg-blue-800 [touch-action:manipulation]"
              onClick={submit}
            >
              Apply link
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Toolbar tooltip ───────────────────────────────────────────────────────────

/**
 * Toolbar button tooltip rendered via createPortal into document.body.
 * This bypasses the overflow-x:auto clipping on the scrollable toolbar row —
 * the tooltip always floats above the button regardless of any parent overflow.
 * Hidden on mobile (touch = no hover).
 */
function BtnTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const show = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ x: r.left + r.width / 2, y: r.top });
  };
  const hide = () => setCoords(null);

  return (
    <span
      ref={anchorRef}
      className="inline-flex items-center flex-shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
      onMouseDown={hide}   /* hide on click so it doesn't linger after action */
    >
      {children}
      {coords && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y - 6,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="hidden sm:block whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium leading-none text-white shadow-xl"
        >
          {label}
          {/* Arrow pointing down toward the button */}
          <span
            style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #0f172a' }}
          />
        </span>,
        document.body,
      )}
    </span>
  );
}

// ─── Toolbar component ─────────────────────────────────────────────────────────

function EditorToolbar({
  editorRef,
  onImageClick,
  selectedImg,
  onImageWidth,
  onAlign,
  formatState,
  onFormat,
  tablePickerOpen,
  onTablePickerToggle,
  onTableInsert,
  onLinkClick,
  selectedImgWrap,
  imageWrapSupported,
  onImageWrapToggle,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onImageClick: () => void;
  selectedImg: HTMLImageElement | null;
  onImageWidth: (mode: 'sm' | 'md' | 'lg' | 'full') => void;
  /** Handles Left/Centre/Right alignment for both text and selected images. */
  onAlign: (align: 'left' | 'center' | 'right') => void;
  selectedImgWrap: ImageWrapSide | null;
  imageWrapSupported: boolean;
  onImageWrapToggle: () => void;
  formatState: FormatState;
  onFormat: (fn: () => void) => void;
  tablePickerOpen: boolean;
  onTablePickerToggle: () => void;
  onTableInsert: (rows: number, cols: number) => void;
  onLinkClick: () => void;
}) {
  const [fontColorOpen, setFontColorOpen]       = useState(false);
  const [highlightOpen, setHighlightOpen]       = useState(false);
  const [lastFontColor, setLastFontColor]       = useState('#000000');
  const [lastHighlight, setLastHighlight]       = useState('#fef08a');

  // Refs for picker anchor buttons — used by portalized pickers for fixed positioning.
  const fontColorBtnRef  = useRef<HTMLButtonElement>(null);
  const highlightBtnRef  = useRef<HTMLButtonElement>(null);
  const tableBtnRef      = useRef<HTMLButtonElement>(null);

  /* ── styling helpers ── */
  // Icon button — 36px tall on mobile, 28px on sm+; no border, bg on hover/active
  const ib = (active: boolean, extra = '') =>
    `relative h-9 sm:h-7 min-w-[36px] sm:min-w-[28px] px-2 sm:px-1.5 rounded-md flex items-center
     justify-center text-[13px] select-none transition-all duration-100 flex-shrink-0
     [touch-action:manipulation] ${extra} ${
      active
        ? 'bg-blue-100 text-blue-700 shadow-inner'
        : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200 hover:text-slate-900'
    }`;
  // Separator — taller on mobile to match button height
  const Sep = () => <span className="w-px h-7 sm:h-5 bg-slate-200 mx-0.5 flex-shrink-0" />;
  // Tiny group label (image size)
  const GLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 select-none flex-shrink-0">{children}</span>
  );

  return (
    // On mobile: single row with horizontal scroll (no wrap) so toolbar stays compact.
    // On sm+: wrap naturally across multiple rows.
    //
    // onTouchStart preventDefault: on Android Chrome (portrait), tapping anywhere
    // outside the keyboard's trigger area causes the virtual keyboard to dismiss
    // and reset the caret BEFORE the click event fires. Intercepting touchstart on
    // the entire toolbar div and calling preventDefault() tells the browser "this
    // is an intentional touch on a control, not a tap-to-dismiss", keeping the
    // keyboard up and the selection intact.
    <div
      className="flex flex-nowrap sm:flex-wrap items-center gap-x-1 gap-y-1
                    overflow-x-auto sm:overflow-x-visible
                    rounded-t-lg border border-b-0 border-slate-200
                    bg-gradient-to-b from-slate-50 to-white
                    px-2.5 py-2 print-hide shadow-sm
                    [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      onTouchStart={(e) => e.preventDefault()}
    >

      {/* ── Font family ── */}
      <BtnTooltip label="Font family">
        <select
          title="Font family"
          aria-label="Font family"
          className="h-9 sm:h-7 flex-shrink-0 max-w-[130px] sm:max-w-[120px] rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer hover:border-slate-300 transition-colors [touch-action:manipulation]"
          value={formatState.fontFamily}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value;
            if (!v || !editorRef.current) return;
            onFormat(() => applyFontFamily(editorRef.current!, v));
          }}
        >
          <option value="" style={{ fontFamily: 'inherit' }}>
            {formatState.fontFamily ? 'Font' : 'Font —'}
          </option>
          {EDITOR_FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>
      </BtnTooltip>

      {/* ── Font size ── */}
      <BtnTooltip label="Font size">
        <select
          title="Font size"
          aria-label="Font size"
          className="h-9 sm:h-7 flex-shrink-0 w-[72px] sm:w-[68px] rounded-md border border-slate-200 bg-white px-1.5 text-[12px] text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer hover:border-slate-300 transition-colors [touch-action:manipulation]"
          value={formatState.fontSize}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value;
            if (!v || !editorRef.current) return;
            onFormat(() => applyFontSize(editorRef.current!, v));
          }}
        >
          <option value="">
            {formatState.fontSize ? 'Size' : 'Size —'}
          </option>
          {EDITOR_FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </BtnTooltip>

      <Sep />

      {/* ── Text style group ── */}
      {/* Bold / Italic / Underline use applyInlineStyle (DOM span-wrapper) instead of
          execCommand — execCommand for style commands is silently ignored by Android
          Chrome when the element gained focus programmatically rather than by a direct
          tap inside the editor itself. applyInlineStyle works via the Range API and is
          fully reliable on all browsers including Android Chrome. */}
      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-slate-100/70 px-0.5 py-0.5">
        <BtnTooltip label="Bold (Ctrl+B)">
          <button
            type="button"
            className={ib(formatState.bold, 'font-black')}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!editorRef.current) return;
              onFormat(() => applyInlineStyle('font-weight', formatState.bold ? 'normal' : 'bold', editorRef.current!));
            }}
          >B</button>
        </BtnTooltip>
        <BtnTooltip label="Italic (Ctrl+I)">
          <button
            type="button"
            className={ib(formatState.italic, 'italic font-semibold')}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!editorRef.current) return;
              onFormat(() => applyInlineStyle('font-style', formatState.italic ? 'normal' : 'italic', editorRef.current!));
            }}
          >I</button>
        </BtnTooltip>
        <BtnTooltip label="Underline (Ctrl+U)">
          <button
            type="button"
            className={ib(formatState.underline, 'underline')}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!editorRef.current) return;
              onFormat(() => applyInlineStyle('text-decoration', formatState.underline ? 'none' : 'underline', editorRef.current!));
            }}
          >U</button>
        </BtnTooltip>
        <BtnTooltip label="Subscript">
          <button type="button" className={ib(formatState.subscript)} onPointerDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('subscript'))}>
            <span className="text-[11px] leading-none">x<sub className="text-[8px]">2</sub></span>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Superscript">
          <button type="button" className={ib(formatState.superscript)} onPointerDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('superscript'))}>
            <span className="text-[11px] leading-none">x<sup className="text-[8px]">2</sup></span>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Font colour ── */}
      <div className="flex-shrink-0">
        <BtnTooltip label="Font colour">
          <button
            ref={fontColorBtnRef}
            type="button"
            className={ib(fontColorOpen)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => { setFontColorOpen((v) => !v); setHighlightOpen(false); }}
          >
            <span className="flex flex-col items-center leading-none gap-[2px]">
              <span className="text-[12px] font-black leading-none" style={{ color: lastFontColor === '#ffffff' ? '#000' : lastFontColor }}>A</span>
              <span className="h-[3px] w-[14px] rounded-sm" style={{ background: lastFontColor }} />
            </span>
          </button>
        </BtnTooltip>
        {fontColorOpen && (
          <ColorPicker
            anchorRef={fontColorBtnRef}
            colors={FONT_COLORS}
            onSelect={(c) => {
              setLastFontColor(c);
              if (editorRef.current) {
                onFormat(() => applyInlineStyle('color', c || '#000000', editorRef.current!));
              }
            }}
            onClose={() => setFontColorOpen(false)}
          />
        )}
      </div>

      {/* ── Highlight colour ── */}
      <div className="flex-shrink-0">
        <BtnTooltip label="Highlight colour">
          <button
            ref={highlightBtnRef}
            type="button"
            className={ib(highlightOpen)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => { setHighlightOpen((v) => !v); setFontColorOpen(false); }}
          >
            <span className="flex flex-col items-center leading-none gap-[2px]">
              <span className="text-[11px] font-bold leading-none px-0.5 rounded-sm" style={{ background: lastHighlight, color: '#1e293b' }}>ab</span>
              <span className="h-[3px] w-[14px] rounded-sm" style={{ background: lastHighlight }} />
            </span>
          </button>
        </BtnTooltip>
        {highlightOpen && (
          <ColorPicker
            anchorRef={highlightBtnRef}
            colors={HIGHLIGHT_COLORS}
            onSelect={(c) => {
              setLastHighlight(c || '#fef08a');
              if (editorRef.current) {
                onFormat(() =>
                  applyInlineStyle('background-color', c || 'transparent', editorRef.current!),
                );
              }
            }}
            onClose={() => setHighlightOpen(false)}
            allowRemove
            removeLabel="Remove"
          />
        )}
      </div>

      <Sep />

      {/* ── Indent ── */}
      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-slate-100/70 px-0.5 py-0.5">
        <BtnTooltip label="Decrease indent">
          <button type="button" className={ib(false)} onPointerDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('outdent'))}>
            <span className="text-[14px] leading-none">⇤</span>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Increase indent">
          <button type="button" className={ib(false)} onPointerDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('indent'))}>
            <span className="text-[14px] leading-none">⇥</span>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Alignment ── */}
      {/* onAlign() handles both cases: image selected → auto margins on <img>;
          no image → execCommand justifyLeft/Center/Right on text. */}
      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-slate-100/70 px-0.5 py-0.5">
        <BtnTooltip label="Align left">
          <button
            type="button"
            className={ib(formatState.alignLeft)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onAlign('left')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="9" height="2" rx="1"/><rect x="0" y="9" width="12" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Align centre">
          <button
            type="button"
            className={ib(formatState.alignCenter)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onAlign('center')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="2.5" y="5" width="9" height="2" rx="1"/><rect x="1" y="9" width="12" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Align right">
          <button
            type="button"
            className={ib(formatState.alignRight)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onAlign('right')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="5" y="5" width="9" height="2" rx="1"/><rect x="2" y="9" width="12" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Lists ── */}
      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-slate-100/70 px-0.5 py-0.5">
        <BtnTooltip label="Bullet list">
          <button type="button" className={ib(formatState.unorderedList)} onPointerDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('insertUnorderedList'))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2" r="1.5"/><rect x="4" y="1" width="10" height="2" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6" width="10" height="2" rx="1"/><circle cx="1.5" cy="12" r="1.5"/><rect x="4" y="11" width="10" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Numbered list">
          <button type="button" className={ib(formatState.orderedList)} onPointerDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('insertOrderedList'))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" fontSize="4" fontFamily="monospace">1.</text><rect x="5" y="1" width="9" height="2" rx="1"/><text x="0" y="9" fontSize="4" fontFamily="monospace">2.</text><rect x="5" y="6" width="9" height="2" rx="1"/><text x="0" y="14" fontSize="4" fontFamily="monospace">3.</text><rect x="5" y="11" width="9" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Hyperlink ── */}
      <BtnTooltip label="Insert hyperlink">
        <button
          type="button"
          className={ib(false)}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setFontColorOpen(false);
            setHighlightOpen(false);
            onLinkClick();
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden>
            <path d="M6.2 8.8a3.2 3.2 0 0 0 4.5 0l1.6-1.6a3.2 3.2 0 0 0-4.5-4.5L6.8 3.6" strokeLinecap="round" />
            <path d="M8.8 6.2a3.2 3.2 0 0 0-4.5 0L2.7 7.8a3.2 3.2 0 0 0 4.5 4.5l1-1" strokeLinecap="round" />
          </svg>
        </button>
      </BtnTooltip>

      <Sep />

      {/* ── Table ── */}
      <div className="flex-shrink-0">
        <BtnTooltip label="Insert table">
          <button
            ref={tableBtnRef}
            type="button"
            className={ib(tablePickerOpen)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => { onTablePickerToggle(); setFontColorOpen(false); setHighlightOpen(false); }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="1" y="1" width="13" height="13" rx="1.5"/>
              <line x1="1" y1="5" x2="14" y2="5"/><line x1="1" y1="9" x2="14" y2="9"/>
              <line x1="5" y1="1" x2="5" y2="14"/><line x1="9" y1="1" x2="9" y2="14"/>
            </svg>
          </button>
        </BtnTooltip>
        {tablePickerOpen && (
          <TablePicker anchorRef={tableBtnRef} onInsert={onTableInsert} onClose={onTablePickerToggle} />
        )}
      </div>

      <Sep />

      {/* ── Image ── */}
      <BtnTooltip label="Insert image">
        <button
          type="button"
          className={ib(false)}
          onPointerDown={(e) => e.preventDefault()}
          onClick={onImageClick}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="1" y="2" width="13" height="11" rx="1.5"/>
            <circle cx="5" cy="5.5" r="1.2"/>
            <polyline points="1,11 5,7 8,10 10,8 14,12"/>
          </svg>
        </button>
      </BtnTooltip>

      {/* Image width controls — only when an image is clicked */}
      {selectedImg && (
        <>
          <Sep />
          <GLabel>Img size</GLabel>
          {(['sm', 'md', 'lg', 'full'] as const).map((mode) => (
            <BtnTooltip
              key={mode}
              label={mode === 'sm' ? 'Small — 260 px' : mode === 'md' ? 'Medium — 380 px' : mode === 'lg' ? 'Large — 560 px' : 'Full width'}
            >
              <button
                type="button"
                className={ib(false, 'text-[11px] font-semibold')}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onImageWidth(mode)}
              >
                {mode === 'sm' ? 'S' : mode === 'md' ? 'M' : mode === 'lg' ? 'L' : 'Full'}
              </button>
            </BtnTooltip>
          ))}
          <BtnTooltip label={imageWrapSupported ? 'Wrap text around image (drag image to reposition)' : 'Text wrap requires S, M, or L size (not Full width)'}>
            <button
              type="button"
              className={ib(!!selectedImgWrap, 'text-[11px] font-semibold px-2')}
              disabled={!imageWrapSupported}
              onPointerDown={(e) => e.preventDefault()}
              onClick={onImageWrapToggle}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
                <rect x="1" y="2" width="5" height="5" rx="0.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" />
                <path d="M7 3.5h6M7 6h5M7 8.5h6M7 11h4" strokeLinecap="round" />
              </svg>
            </button>
          </BtnTooltip>
        </>
      )}
    </div>
  );
}

// ─── Main editor ───────────────────────────────────────────────────────────────

function CustomBodyEditor({
  html,
  readOnly,
  onCommit,
}: {
  html: string;
  readOnly: boolean;
  onCommit: (next: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const [imgRev, setImgRev] = useState(0);
  const [imgError, setImgError] = useState<string | null>(null);
  const imgErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogDraft, setLinkDialogDraft] = useState({
    url: '',
    text: '',
    canRemove: false,
  });
  const [tableCtx, setTableCtx] = useState<TableContext | null>(null);
  /**
   * Saved last-known selection range while the cursor was inside the editor.
   * Restored inside onFormat so mobile toolbar taps work even if the browser
   * briefly moved focus away and collapsed the selection.
   */
  const savedSelectionRef = useRef<Range | null>(null);
  /**
   * Mirrors tableCtx in a ref so onTableAction can always read the last valid
   * table context even if React state has already been cleared by a
   * selectionchange event that fired between the touchstart and onClick.
   */
  const tableCtxRef = useRef<TableContext | null>(null);
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    orderedList: false,
    unorderedList: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    subscript: false,
    superscript: false,
    fontFamily: '',
    fontSize: '',
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || readOnly) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== html) {
      el.innerHTML = html;
      selectedImgRef.current = null;
      highlightSelectedImg(el, null);
      setImgRev((n) => n + 1);
    }
  }, [html, readOnly]);

  // Track selection changes to update toolbar active states + table context
  const refreshFormatState = useCallback(() => {
    try {
      const base = getFormatState();
      const typo = ref.current ? getSelectionTypography(ref.current) : { fontFamily: '', fontSize: '' };
      setFormatState({ ...base, ...typo });
    } catch { /* ignore */ }
    const ctx = ref.current ? getTableContext(ref.current) : null;
    setTableCtx(ctx);
    tableCtxRef.current = ctx;

    // Save the current selection range, but ONLY when the editor is the active
    // element. On Android Chrome, after the editor blurs (user taps toolbar),
    // `selectionchange` can fire again with the caret snapped to the editor's
    // start position (anchorNode still inside the editor, but wrong offset).
    // Guarding on `document.activeElement` prevents that spurious
    // `selectionchange` from overwriting the correct range saved by `onBlur`.
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ref.current && document.activeElement === ref.current) {
        const anchor = sel.anchorNode;
        const inEditor =
          anchor &&
          ref.current.contains(
            anchor.nodeType === Node.TEXT_NODE ? (anchor.parentNode as Node) : anchor,
          );
        if (inEditor) savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshFormatState);
    return () => document.removeEventListener('selectionchange', refreshFormatState);
  }, [refreshFormatState]);

  const commitFromEditor = useCallback(() => {
    if (ref.current) onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
  }, [onCommit]);

  /** Run a format command, then re-focus the editor and commit. */
  const restoreSavedSelection = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rangeToRestore = (() => {
      try { return savedSelectionRef.current?.cloneRange() ?? null; }
      catch { return null; }
    })();
    el.focus();
    if (!rangeToRestore) return;
    try {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(rangeToRestore);
      }
    } catch { /* ignore */ }
  }, []);

  const openLinkDialog = useCallback(() => {
    setTablePickerOpen(false);
    restoreSavedSelection();
    const el = ref.current;
    if (!el) return;
    const ctx = readProposalEditorLinkContext(el);
    setLinkDialogDraft({
      url: ctx.url,
      text: ctx.text,
      canRemove: ctx.hasLink,
    });
    setLinkDialogOpen(true);
  }, [restoreSavedSelection]);

  const onFormat = useCallback((fn: () => void) => {
    const el = ref.current;
    if (!el) return;

    // ─── Android Chrome root-cause fix ────────────────────────────────────────
    // Problem: el.focus() below fires a synchronous `selectionchange` event,
    // which calls refreshFormatState(), which OVERWRITES savedSelectionRef with
    // whatever position Android Chrome auto-placed the caret (usually element
    // start). By the time we read savedSelectionRef to restore it, it already
    // holds the wrong (overwritten) value — so every command runs at the wrong
    // position and formatting appears to do nothing.
    //
    // Fix: snapshot the range we want to restore BEFORE calling el.focus().
    // The snapshot is immune to the subsequent selectionchange overwrite.
    const rangeToRestore = (() => {
      try { return savedSelectionRef.current?.cloneRange() ?? null; }
      catch { return null; }
    })();

    el.focus();

    // Unconditionally restore the snapshotted range. On desktop this is a
    // no-op (the range equals the current selection). On Android Chrome this
    // puts the caret/selection back exactly where the user had it before the
    // toolbar tap blurred the editor.
    if (rangeToRestore) {
      try {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(rangeToRestore);
        }
      } catch { /* ignore */ }
    }

    fn();
    refreshFormatState();
    commitFromEditor();
  }, [commitFromEditor, refreshFormatState]);

  /**
   * Run a direct DOM table operation (no execCommand), then commit.
   * Uses tableCtxRef (not tableCtx state) so the correct context is always
   * available even if a selectionchange event cleared the state before onClick.
   */
  const onTableAction = useCallback((fn: () => void) => {
    fn();
    if (ref.current) onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
    const ctx = ref.current ? getTableContext(ref.current) : null;
    setTableCtx(ctx);
    tableCtxRef.current = ctx;
  }, [onCommit]);

  const showImgError = (msg: string) => {
    setImgError(msg);
    if (imgErrorTimerRef.current) clearTimeout(imgErrorTimerRef.current);
    imgErrorTimerRef.current = setTimeout(() => setImgError(null), 5000);
  };

  const insertImageFromFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showImgError('Only image files (JPG, PNG, WebP, etc.) can be inserted.');
      return;
    }
    const dataUrl = await compressImageFileToDataUrl(file);
    if (!dataUrl || !ref.current) {
      showImgError('Image is too large to insert even after compression. Try a smaller or lower-resolution image.');
      return;
    }
    insertHtmlIntoCaret(ref.current, `<img src="${dataUrl}" alt="" width="${IMG_WIDTH_MD}" />`);
    commitFromEditor();
  };

  const applyImageWidth = (mode: 'sm' | 'md' | 'lg' | 'full') => {
    const img = selectedImgRef.current;
    const root = ref.current;
    if (!img || !root?.contains(img)) return;
    if (mode === 'full') {
      setImageTextWrap(img, null);
      img.removeAttribute('width');
      img.removeAttribute('height');
    } else {
      const w = mode === 'sm' ? IMG_WIDTH_SM : mode === 'md' ? IMG_WIDTH_MD : IMG_WIDTH_LG;
      img.setAttribute('width', String(w));
      img.removeAttribute('height');
    }
    highlightSelectedImg(root, img);
    commitFromEditor();
    setImgRev((n) => n + 1);
  };

  /**
   * Align the entire <table> within the editor using auto margins.
   * Works on display:table the same way auto margins work on display:block.
   * Called from the TableContextBar, not the main toolbar, so text alignment
   * inside cells is completely unaffected.
   */
  const applyTableAlign = useCallback((align: 'left' | 'center' | 'right') => {
    const ctx = tableCtx;
    const root = ref.current;
    if (!ctx?.table || !root?.contains(ctx.table)) return;
    const table = ctx.table as HTMLTableElement;
    table.style.marginLeft  = align === 'left'   ? '0'    : 'auto';
    table.style.marginRight = align === 'right'  ? '0'    : 'auto';
    if (align === 'center') {
      table.style.marginLeft  = 'auto';
      table.style.marginRight = 'auto';
    }
    if (root) onCommit(sanitizeProposalCustomBodyHtml(root.innerHTML));
  }, [tableCtx, onCommit]);

  /**
   * Set the overall width of the table the cursor is currently in.
   * Clears per-cell pixel widths so columns redistribute evenly within
   * the new table width. 'auto' lets the table shrink to content width.
   */
  const applyTableWidth = useCallback((width: 'auto' | '33%' | '50%' | '75%' | '100%') => {
    const ctx = tableCtx;
    const root = ref.current;
    if (!ctx?.table || !root?.contains(ctx.table)) return;
    const table = ctx.table as HTMLTableElement;

    // Set table width via CSS (remove HTML width attr to avoid conflicts)
    table.removeAttribute('width');
    if (width === 'auto') {
      table.style.width = '';
      table.style.minWidth = '';
    } else {
      table.style.width = width;
      table.style.minWidth = '';
    }

    // Clear per-cell fixed pixel widths so columns scale proportionally
    table.querySelectorAll<HTMLElement>('td, th').forEach((cell) => {
      cell.removeAttribute('width');
      cell.style.width = '';
      cell.style.minWidth = '';
    });
    // Clear per-col <col> widths too if present
    table.querySelectorAll<HTMLElement>('col').forEach((col) => {
      col.removeAttribute('width');
      col.style.width = '';
    });

    if (root) onCommit(sanitizeProposalCustomBodyHtml(root.innerHTML));
  }, [tableCtx, onCommit]);

  /**
   * Unified alignment handler. When an S/M/L image is selected, we set
   * margin-left/right on the <img> itself (images are display:block via Tailwind
   * preflight, so text-align on the parent has no effect — auto margins do).
   * When no image is selected, falls back to execCommand justify*.
   */
  const applyAlign = useCallback((align: 'left' | 'center' | 'right') => {
    const img = selectedImgRef.current;
    const root = ref.current;

    if (img && root?.contains(img) && imageSupportsTextWrap(img)) {
      if (getImageWrapSide(img)) {
        if (align === 'center') {
          setImageTextWrap(img, null);
          setImageBlockAlign(img, 'center');
        } else {
          setImageTextWrap(img, align === 'right' ? 'right' : 'left');
        }
      } else {
        setImageBlockAlign(img, align);
      }
      highlightSelectedImg(root, img);
      onCommit(sanitizeProposalCustomBodyHtml(root.innerHTML));
      setImgRev((n) => n + 1);
    } else if (img && root?.contains(img) && !img.hasAttribute('width')) {
      setImageTextWrap(img, null);
      const execAlignCmd = align === 'left' ? 'justifyLeft' : align === 'center' ? 'justifyCenter' : 'justifyRight';
      onFormat(() => document.execCommand(execAlignCmd));
    } else {
      // Text / paragraph alignment
      const execAlignCmd = align === 'left' ? 'justifyLeft' : align === 'center' ? 'justifyCenter' : 'justifyRight';
      onFormat(() => document.execCommand(execAlignCmd));
    }
  }, [onCommit, onFormat]);

  const handleImageWrapToggle = useCallback(() => {
    const img = selectedImgRef.current;
    const root = ref.current;
    if (!img || !root?.contains(img)) return;
    if (!imageSupportsTextWrap(img)) {
      showImgError('Text wrap works on Small, Medium, or Large images — not Full width.');
      return;
    }
    toggleImageTextWrap(img);
    highlightSelectedImg(root, img);
    commitFromEditor();
    setImgRev((n) => n + 1);
  }, [commitFromEditor]);

  useEffect(() => {
    const root = ref.current;
    const img = selectedImgRef.current;
    if (!root || !img || !root.contains(img) || readOnly) return;
    if (!getImageWrapSide(img)) return;
    return attachWrappedImageDrag(img, root, commitFromEditor);
  }, [imgRev, readOnly, commitFromEditor]);

  const onEditorClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const root = ref.current;
    if (!root) return;
    const t = e.target;
    if (t instanceof HTMLImageElement && root.contains(t)) {
      selectedImgRef.current = t;
      highlightSelectedImg(root, t);
    } else {
      selectedImgRef.current = null;
      highlightSelectedImg(root, null);
    }
    setImgRev((n) => n + 1);
  };

  /** Insert the first image file found in a DataTransfer. Returns true if inserted. */
  const pasteImageFromDataTransfer = (dt: DataTransfer): boolean => {
    const items = dt.items;
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) { void insertImageFromFile(f); return true; }
        }
      }
    }
    const { files } = dt;
    if (files?.length) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type.startsWith('image/')) { void insertImageFromFile(f); return true; }
      }
    }
    return false;
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const dt = e.clipboardData;
    if (!dt || !ref.current) return;

    const htmlRaw = dt.getData('text/html');
    const plain   = dt.getData('text/plain') ?? '';
    const source  = detectOfficeSource(htmlRaw);

    // ── PowerPoint → paste as image ─────────────────────────────────────────
    // PPT slides are not useful as editable text; grab the bitmap instead.
    if (source === 'powerpoint') {
      e.preventDefault();
      e.stopPropagation();
      if (!pasteImageFromDataTransfer(dt)) {
        // No image on clipboard (e.g. macOS PPT) — fall through to rich text
        const cleaned = sanitizeProposalCustomBodyHtml(preCleanRichPasteHtml(htmlRaw));
        if (cleaned.trim()) {
          const probe = document.createElement('div');
          probe.innerHTML = cleaned;
          normalizePastedEditorTypography(probe);
          insertHtmlIntoCaret(ref.current, probe.innerHTML);
          commitFromEditor();
          refreshFormatState();
        }
      }
      return;
    }

    // ── Excel → extract cells and paste as a clean table ────────────────────
    if (source === 'excel' && htmlRaw) {
      e.preventDefault();
      e.stopPropagation();
      const cleaned = sanitizeProposalCustomBodyHtml(preCleanRichPasteHtml(htmlRaw));
      const probe = document.createElement('div');
      probe.innerHTML = cleaned;
      const tables = probe.querySelectorAll('table');
      if (tables.length > 0) {
        normalizePastedEditorTypography(probe);
        insertHtmlIntoCaret(ref.current, probe.innerHTML);
      } else {
        // Fallback: plain text rows if no <table> survived sanitisation
        const lines = plain.split(/\r?\n/).filter(Boolean);
        const rows  = lines.map((l) =>
          `<tr>${l.split('\t').map((c) => `<td>${c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join('')}</tr>`
        );
        if (rows.length) insertHtmlIntoCaret(ref.current, `<table>${rows.join('')}</table>`);
      }
      commitFromEditor();
      return;
    }

    // ── Word / Google Docs / web → paste as rich text ────────────────────────
    if (htmlRaw && htmlRaw.trim().length > 0) {
      const cleaned = sanitizeProposalCustomBodyHtml(preCleanRichPasteHtml(htmlRaw));
      const probe = document.createElement('div');
      probe.innerHTML = cleaned;
      const textLen = (probe.textContent ?? '').replace(/\u00a0/g, ' ').trim().length;
      const meaningful = textLen > 0 || !!probe.querySelector('img,table,ul,ol,a,h3,h4,blockquote');
      if (meaningful) {
        e.preventDefault();
        e.stopPropagation();
        normalizePastedEditorTypography(probe);
        insertHtmlIntoCaret(ref.current, probe.innerHTML);
        commitFromEditor();
        refreshFormatState();
        return;
      }
    }

    // ── Plain text fallback ──────────────────────────────────────────────────
    if (plain.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const escaped = plain
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const lines = escaped.split(/\r?\n/);
      insertHtmlIntoCaret(ref.current, lines.map((l) => `<p>${l || '<br />'}</p>`).join(''));
      commitFromEditor();
      return;
    }

    // ── Bare image (screenshot tool, image editor) → paste as image ──────────
    if (pasteImageFromDataTransfer(dt)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onFilePick = (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (f) void insertImageFromFile(f);
  };

  if (readOnly) {
    return (
      <div
        className="text-sm text-secondary-800 leading-relaxed space-y-2 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-semibold [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-secondary-200 [&_img.pe-img-wrap-l]:float-left [&_img.pe-img-wrap-r]:float-right [&_img.pe-img-wrap-l]:mr-3 [&_img.pe-img-wrap-r]:ml-3 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-secondary-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-secondary-50"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-secondary-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-400/40 focus-within:border-primary-300">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFilePick} />

      <EditorToolbar
        key={imgRev}
        editorRef={ref}
        onImageClick={() => fileRef.current?.click()}
        selectedImg={selectedImgRef.current && ref.current?.contains(selectedImgRef.current) ? selectedImgRef.current : null}
        onImageWidth={applyImageWidth}
        onAlign={applyAlign}
        formatState={formatState}
        onFormat={onFormat}
        tablePickerOpen={tablePickerOpen}
        onTablePickerToggle={() => setTablePickerOpen((v) => !v)}
        onTableInsert={(rows, cols) => {
          setTablePickerOpen(false);
          onFormat(() => insertHtmlIntoCaret(ref.current!, makeTable(rows, cols)));
        }}
        onLinkClick={openLinkDialog}
        selectedImgWrap={
          selectedImgRef.current && ref.current?.contains(selectedImgRef.current)
            ? getImageWrapSide(selectedImgRef.current)
            : null
        }
        imageWrapSupported={
          !!selectedImgRef.current &&
          !!ref.current?.contains(selectedImgRef.current) &&
          imageSupportsTextWrap(selectedImgRef.current)
        }
        onImageWrapToggle={handleImageWrapToggle}
      />

      <LinkDialog
        open={linkDialogOpen}
        initialUrl={linkDialogDraft.url}
        initialText={linkDialogDraft.text}
        canRemove={linkDialogDraft.canRemove}
        onClose={() => setLinkDialogOpen(false)}
        onApply={(url, text) => {
          setLinkDialogOpen(false);
          onFormat(() => {
            if (ref.current) applyProposalEditorLink(ref.current, url, text);
          });
        }}
        onRemove={() => {
          onFormat(() => {
            if (ref.current) removeProposalEditorLink(ref.current);
          });
        }}
      />

      {selectedImgRef.current &&
        ref.current?.contains(selectedImgRef.current) &&
        getImageWrapSide(selectedImgRef.current) && (
        <div className="print-hide flex items-center gap-2 px-3 py-2 bg-sky-50 border-b border-sky-200 text-[11px] sm:text-xs text-sky-800">
          <span className="shrink-0" aria-hidden>↕</span>
          <span>Text wrap on — drag the image up or down to reposition; text flows on the sides.</span>
        </div>
      )}

      {imgError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          <span className="shrink-0">⚠</span>
          <span>{imgError}</span>
          <button
            type="button"
            className="ml-auto shrink-0 text-red-400 hover:text-red-600"
            onClick={() => setImgError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Show the context bar if either the React state OR the ref has a valid
          context — the ref survives a brief selectionchange-clear on mobile. */}
      {(tableCtx ?? tableCtxRef.current) && (
        <TableContextBar
          ctx={(tableCtx ?? tableCtxRef.current)!}
          onTableAction={onTableAction}
          onTableAlign={applyTableAlign}
          onTableWidth={applyTableWidth}
        />
      )}

      <div
        ref={ref}
        className="min-h-[140px] bg-white px-3 py-2.5 text-sm text-secondary-800 focus:outline-none [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:border [&_img]:border-secondary-200 [&_img.pe-img-wrap-l]:float-left [&_img.pe-img-wrap-r]:float-right [&_img.pe-img-wrap-l]:mr-3 [&_img.pe-img-wrap-r]:ml-3 [&_table]:border-collapse [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-secondary-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-secondary-50"
        contentEditable
        suppressContentEditableWarning
        onMouseDown={(ev) => ev.stopPropagation()}
        onClick={onEditorClick}
        onKeyUp={refreshFormatState}
        onPaste={onPaste}
        onBlur={() => {
          // ── Android Chrome: save selection on blur ──────────────────────────
          // On Android Chrome, the editor blurs (touchstart on toolbar button)
          // BEFORE `selectionchange` fires. At this exact moment
          // window.getSelection() still holds the user's range. We snapshot it
          // here so onFormat() has a guaranteed-correct range to restore even
          // after selectionchange subsequently clears the selection.
          try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const anchor = sel.anchorNode;
              const el = ref.current;
              const inEditor =
                anchor &&
                el &&
                el.contains(
                  anchor.nodeType === Node.TEXT_NODE
                    ? (anchor.parentNode as Node)
                    : anchor,
                );
              if (inEditor) {
                savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
              }
            }
          } catch { /* ignore */ }
          highlightSelectedImg(ref.current, null);
          selectedImgRef.current = null;
          setImgRev((n) => n + 1);
          commitFromEditor();
        }}
      />
    </div>
  );
}

function MediaPreview({ url }: { url: string }) {
  const embed = youtubeEmbedFromUrl(url);
  if (embed) {
    return (
      <div className="mt-3 max-w-xl rounded-lg overflow-hidden border border-secondary-200 bg-black/5 aspect-video">
        <iframe
          title="Embedded video"
          src={embed}
          className="w-full h-full min-h-[200px]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  if (isMp4MediaUrl(url)) {
    return (
      <div className="mt-3 max-w-xl rounded-lg overflow-hidden border border-secondary-200 bg-black">
        <video controls className="w-full max-h-[360px]" src={url} />
      </div>
    );
  }
  return (
    <p className="mt-2 text-xs text-amber-700">
      Use a supported <strong>https</strong> YouTube link or a direct <strong>.mp4</strong> URL.
    </p>
  );
}

type Props = {
  sections: ProposalCustomSectionBeforeBoq[];
  onChange: (next: ProposalCustomSectionBeforeBoq[]) => void;
  readOnly: boolean;
};

export function CustomSectionsBeforeBoq({ sections, onChange, readOnly }: Props) {
  const [mediaPanelOpen, setMediaPanelOpen] = useState<Record<string, boolean>>({});

  const updateAt = (index: number, patch: Partial<ProposalCustomSectionBeforeBoq>) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    const t = next[index]!;
    next[index] = next[j]!;
    next[j] = t;
    onChange(next);
  };

  const removeAt = (index: number) => {
    const id = sections[index]?.id;
    onChange(sections.filter((_, i) => i !== index));
    if (id) {
      setMediaPanelOpen((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }
  };

  const addSection = () => {
    const id = newCustomSectionId();
    onChange([
      ...sections,
      {
        id,
        title: '',
        bodyHtml: '',
      },
    ]);
  };

  const showMediaPanel = (s: ProposalCustomSectionBeforeBoq) => {
    if (readOnly) return !!(s.mediaUrl?.trim() || s.mediaPosterUrl?.trim());
    return !!(s.mediaUrl?.trim() || s.mediaPosterUrl?.trim() || mediaPanelOpen[s.id]);
  };

  if (sections.length === 0 && readOnly) {
    return null;
  }

  return (
    <div
      className="mb-8 pdf-section"
      {...{ [PE_MANAGED_SECTION_ATTR]: PE_MANAGED_BEFORE_BOQ }}
      contentEditable={false}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="space-y-8">
        {sections.map((s, index) => (
          <div key={s.id} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-1 rounded-full flex-shrink-0 mt-1"
                  style={{ background: '#0369a1', height: '28px' }}
                />
                <span className="text-lg leading-none flex-shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  {readOnly ? (
                    <h2
                      className="text-base font-extrabold uppercase tracking-widest"
                      style={{ color: '#0369a1' }}
                    >
                      {(s.title || '').trim() || 'Untitled'}
                    </h2>
                  ) : (
                    <input
                      type="text"
                      value={s.title}
                      onChange={(e) => updateAt(index, { title: e.target.value })}
                      className="w-full text-base font-extrabold uppercase tracking-widest bg-transparent border-b-2 border-secondary-200 pb-1 outline-none focus:border-primary-500 placeholder:text-secondary-400 placeholder:font-semibold"
                      style={{ color: '#0369a1' }}
                      placeholder="Section title"
                    />
                  )}
                </div>
              </div>
              {!readOnly && (
                <div className="flex flex-wrap gap-2 print-hide sm:pt-0.5">
                  <button
                    type="button"
                    className="text-xs font-semibold px-2 py-1 rounded border border-secondary-300 bg-white hover:bg-secondary-50"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold px-2 py-1 rounded border border-secondary-300 bg-white hover:bg-secondary-50"
                    onClick={() => move(index, 1)}
                    disabled={index === sections.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold px-2 py-1 rounded border border-red-200 text-red-700 bg-white hover:bg-red-50"
                    onClick={() => removeAt(index)}
                  >
                    Remove section
                  </button>
                </div>
              )}
            </div>

            <CustomBodyEditor
              html={s.bodyHtml}
              readOnly={readOnly}
              onCommit={(bodyHtml) => updateAt(index, { bodyHtml })}
            />

            {!readOnly && !showMediaPanel(s) ? (
              <div className="mt-3 print-hide">
                <button
                  type="button"
                  className="text-xs font-semibold text-primary-700 hover:text-primary-900 underline-offset-2 hover:underline"
                  onClick={() => setMediaPanelOpen((prev) => ({ ...prev, [s.id]: true }))}
                >
                  + Add video or media link
                </button>
              </div>
            ) : null}

            {showMediaPanel(s) ? (
              <div className="mt-4 rounded-lg border border-secondary-200 bg-white px-3 py-3 space-y-2">
                {!readOnly ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 print-hide">
                    <span className="text-xs font-medium text-secondary-700">Video or media link</span>
                    <button
                      type="button"
                      className="text-xs text-secondary-600 hover:text-secondary-900 underline"
                      onClick={() => {
                        updateAt(index, { mediaUrl: undefined, mediaPosterUrl: undefined });
                        setMediaPanelOpen((prev) => ({ ...prev, [s.id]: false }));
                      }}
                    >
                      Remove media
                    </button>
                  </div>
                ) : null}
                {readOnly ? (
                  s.mediaUrl ? (
                    <>
                      <a
                        href={s.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 break-all"
                      >
                        {s.mediaUrl}
                      </a>
                      {s.mediaPosterUrl ? (
                        <img
                          src={s.mediaPosterUrl}
                          alt=""
                          className="mt-2 max-w-md rounded-lg border border-secondary-200"
                        />
                      ) : null}
                      <MediaPreview url={s.mediaUrl} />
                    </>
                  ) : s.mediaPosterUrl ? (
                    <img
                      src={s.mediaPosterUrl}
                      alt=""
                      className="max-w-md rounded-lg border border-secondary-200"
                    />
                  ) : null
                ) : (
                  <>
                    <input
                      type="url"
                      value={s.mediaUrl ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateAt(index, { mediaUrl: v || undefined });
                      }}
                      placeholder="YouTube or https://…/video.mp4"
                      className="w-full rounded border border-secondary-200 px-2 py-1.5 text-xs"
                    />
                    {s.mediaUrl ? <MediaPreview url={s.mediaUrl} /> : null}
                    <input
                      type="url"
                      value={s.mediaPosterUrl ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateAt(index, { mediaPosterUrl: v || undefined });
                      }}
                      placeholder="Optional poster image URL (https)"
                      className="w-full rounded border border-secondary-200 px-2 py-1.5 text-xs"
                    />
                  </>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-6 print-hide">
          <button
            type="button"
            onClick={addSection}
            className="text-xs font-semibold px-4 py-2 rounded-xl border-2 border-primary-200 bg-primary-50 text-primary-900 hover:bg-primary-100"
          >
            + Add section
          </button>
        </div>
      )}
    </div>
  );
}
