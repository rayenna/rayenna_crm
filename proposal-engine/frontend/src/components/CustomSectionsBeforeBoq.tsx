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

/** Resize / JPEG-compress so pasted photos stay under sanitiser limits and save reliably. */
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

    let { width, height } = img;
    const maxW = 1600;
    if (width > maxW) {
      height = Math.round((height * maxW) / width);
      width = maxW;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    let q = 0.88;
    let dataUrl = canvas.toDataURL('image/jpeg', q);
    while (dataUrl.length > 850_000 && q > 0.45) {
      q -= 0.06;
      dataUrl = canvas.toDataURL('image/jpeg', q);
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
  el.focus();
  try {
    document.execCommand('insertHTML', false, html);
    return;
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

const FONT_FAMILIES = [
  { label: 'Arial',            value: 'Arial, sans-serif' },
  { label: 'Calibri',          value: 'Calibri, sans-serif' },
  { label: 'Courier New',      value: '"Courier New", monospace' },
  { label: 'Garamond',         value: 'Garamond, serif' },
  { label: 'Georgia',          value: 'Georgia, serif' },
  { label: 'Sans Serif',       value: 'sans-serif' },
  { label: 'Times New Roman',  value: '"Times New Roman", serif' },
  { label: 'Trebuchet MS',     value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana',          value: 'Verdana, sans-serif' },
];

const FONT_SIZES = [
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
];

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
function applyInlineStyle(property: string, value: string, editorEl: HTMLElement): void {
  editorEl.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);

  if (range.collapsed) {
    // No selection — set a "pending" style that will apply to the next typed character
    // via execCommand styleWithCSS trick
    document.execCommand('styleWithCSS', false, 'true');
    if (property === 'font-family') document.execCommand('fontName', false, value);
    else if (property === 'font-size') {
      // Map to nearest execCommand fontSize bucket (1-7) just to trigger the span,
      // then fix it up immediately.
      document.execCommand('fontSize', false, '3');
      const sel2 = window.getSelection();
      if (sel2 && sel2.rangeCount > 0) {
        const r2 = sel2.getRangeAt(0);
        const span = r2.startContainer.parentElement;
        if (span && span !== editorEl) span.style.fontSize = value;
      }
    }
    document.execCommand('styleWithCSS', false, 'false');
    return;
  }

  // Extract, wrap, re-insert
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
  };
}

// ─── Color picker popover ──────────────────────────────────────────────────────

function ColorPicker({
  colors,
  onSelect,
  onClose,
  allowRemove = false,
  removeLabel = 'None',
}: {
  colors: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
  allowRemove?: boolean;
  removeLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  return (
    <div
      ref={wrapRef}
      className="absolute z-50 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl p-3
                 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Swatches — 24px on mobile for easy tapping, 22px on sm+ */}
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
            onClick={() => { onSelect(''); onClose(); }}
          >
            {removeLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Table row×col picker popover ─────────────────────────────────────────────

const PICKER_MAX = 8;

function TablePicker({
  onInsert,
  onClose,
}: {
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  return (
    <div
      ref={wrapRef}
      className="absolute z-50 top-full mt-1 bg-white border border-secondary-200 rounded-xl shadow-xl p-3 select-none
                 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0"
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="text-xs sm:text-[10px] font-semibold text-secondary-500 mb-2 text-center min-w-[140px]">
        {hover.r > 0 && hover.c > 0
          ? `${hover.c} col${hover.c > 1 ? 's' : ''} × ${hover.r} row${hover.r > 1 ? 's' : ''}`
          : 'Tap to choose size'}
      </p>
      {/* Cells 22px — comfortable on both mobile and desktop */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${PICKER_MAX}, 22px)` }}
      >
        {Array.from({ length: PICKER_MAX }, (_, r) =>
          Array.from({ length: PICKER_MAX }, (_, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-[22px] h-[22px] rounded border cursor-pointer transition-colors [touch-action:manipulation] ${
                r < hover.r && c < hover.c
                  ? 'bg-primary-300 border-primary-500'
                  : 'bg-secondary-100 border-secondary-300 hover:bg-primary-100 hover:border-primary-300'
              }`}
              onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
              onTouchStart={() => setHover({ r: r + 1, c: c + 1 })}
              onClick={() => {
                onInsert(hover.r, hover.c);
                onClose();
              }}
            />
          )),
        )}
      </div>
    </div>
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
}: {
  ctx: TableContext;
  onTableAction: (fn: () => void) => void;
}) {
  const ab = 'text-[11px] sm:text-[10px] font-semibold px-2.5 py-1.5 sm:py-0.5 sm:px-2 rounded-md border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 transition-colors [touch-action:manipulation]';
  const db = 'text-[11px] sm:text-[10px] font-semibold px-2.5 py-1.5 sm:py-0.5 sm:px-2 rounded-md border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors [touch-action:manipulation]';
  const sep = <span className="w-px h-5 sm:h-4 bg-indigo-200/60 flex-shrink-0 mx-0.5" />;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-indigo-50/60 border-b border-indigo-100 print-hide">
      {/* Row ops */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Row</span>
      <button type="button" className={ab} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertRow(ctx, true))}>↑ Above</button>
      <button type="button" className={ab} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertRow(ctx, false))}>↓ Below</button>
      <button type="button" className={db} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableDeleteRow(ctx))}>✕ Row</button>

      {sep}

      {/* Column ops */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Col</span>
      <button type="button" className={ab} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertColumn(ctx, true))}>← Left</button>
      <button type="button" className={ab} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertColumn(ctx, false))}>→ Right</button>
      <button type="button" className={db} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableDeleteColumn(ctx))}>✕ Col</button>

      {sep}

      {/* Column width */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Width</span>
      {COL_WIDTHS.map((w) => (
        <button key={w.label} type="button" className={ab} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableSetColumnWidth(ctx, w.value))}>
          {w.label}
        </button>
      ))}

      {sep}

      {/* Borders */}
      <span className="text-[10px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Borders</span>
      {(['all', 'outer', 'inner', 'none'] as const).map((preset) => (
        <button key={preset} type="button" className={ab} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableSetBorders(ctx, preset))}>
          {preset.charAt(0).toUpperCase() + preset.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ─── Toolbar tooltip ───────────────────────────────────────────────────────────

/**
 * Lightweight CSS-only styled tooltip for toolbar buttons.
 * Hidden on mobile (touch screens have no hover) and shows after a short delay
 * to avoid flickering when the user mouses across the toolbar.
 */
function BtnTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group/tt relative inline-flex items-center flex-shrink-0">
      {children}
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[300]',
          'whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5',
          'text-[11px] font-medium leading-none text-white shadow-xl',
          'opacity-0 group-hover/tt:opacity-100 transition-opacity duration-100 delay-500',
          'hidden sm:block',
        ].join(' ')}
      >
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

// ─── Toolbar component ─────────────────────────────────────────────────────────

function EditorToolbar({
  editorRef,
  onImageClick,
  selectedImg,
  onImageWidth,
  formatState,
  onFormat,
  tablePickerOpen,
  onTablePickerToggle,
  onTableInsert,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onImageClick: () => void;
  selectedImg: HTMLImageElement | null;
  onImageWidth: (mode: 'sm' | 'md' | 'lg' | 'full') => void;
  formatState: FormatState;
  onFormat: (fn: () => void) => void;
  tablePickerOpen: boolean;
  onTablePickerToggle: () => void;
  onTableInsert: (rows: number, cols: number) => void;
}) {
  const [fontColorOpen, setFontColorOpen]       = useState(false);
  const [highlightOpen, setHighlightOpen]       = useState(false);
  const [lastFontColor, setLastFontColor]       = useState('#000000');
  const [lastHighlight, setLastHighlight]       = useState('#fef08a');

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
    <div className="flex flex-nowrap sm:flex-wrap items-center gap-x-1 gap-y-1
                    overflow-x-auto sm:overflow-x-visible
                    rounded-t-lg border border-b-0 border-slate-200
                    bg-gradient-to-b from-slate-50 to-white
                    px-2.5 py-2 print-hide shadow-sm
                    [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      {/* ── Font family ── */}
      <BtnTooltip label="Font family">
        <select
          title="Font family"
          className="h-9 sm:h-7 flex-shrink-0 max-w-[130px] sm:max-w-[120px] rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer hover:border-slate-300 transition-colors [touch-action:manipulation]"
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value; e.target.value = '';
            if (!v || !editorRef.current) return;
            onFormat(() => applyInlineStyle('font-family', v, editorRef.current!));
          }}
        >
          <option value="" disabled>Font</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>
      </BtnTooltip>

      {/* ── Font size ── */}
      <BtnTooltip label="Font size">
        <select
          title="Font size"
          className="h-9 sm:h-7 flex-shrink-0 w-[72px] sm:w-[68px] rounded-md border border-slate-200 bg-white px-1.5 text-[12px] text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer hover:border-slate-300 transition-colors [touch-action:manipulation]"
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value; e.target.value = '';
            if (!v || !editorRef.current) return;
            onFormat(() => applyInlineStyle('font-size', v, editorRef.current!));
          }}
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </BtnTooltip>

      <Sep />

      {/* ── Text style group ── */}
      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-slate-100/70 px-0.5 py-0.5">
        <BtnTooltip label="Bold (Ctrl+B)">
          <button type="button" className={ib(formatState.bold, 'font-black')} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('bold'))}>B</button>
        </BtnTooltip>
        <BtnTooltip label="Italic (Ctrl+I)">
          <button type="button" className={ib(formatState.italic, 'italic font-semibold')} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('italic'))}>I</button>
        </BtnTooltip>
        <BtnTooltip label="Underline (Ctrl+U)">
          <button type="button" className={ib(formatState.underline, 'underline')} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('underline'))}>U</button>
        </BtnTooltip>
        <BtnTooltip label="Subscript">
          <button type="button" className={ib(formatState.subscript)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('subscript'))}>
            <span className="text-[11px] leading-none">x<sub className="text-[8px]">2</sub></span>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Superscript">
          <button type="button" className={ib(formatState.superscript)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('superscript'))}>
            <span className="text-[11px] leading-none">x<sup className="text-[8px]">2</sup></span>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Font colour ── */}
      <div className="relative flex-shrink-0">
        <BtnTooltip label="Font colour">
          <button
            type="button"
            className={ib(fontColorOpen)}
            onMouseDown={(e) => e.preventDefault()}
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
            colors={FONT_COLORS}
            onSelect={(c) => {
              setLastFontColor(c);
              onFormat(() => document.execCommand('foreColor', false, c));
            }}
            onClose={() => setFontColorOpen(false)}
          />
        )}
      </div>

      {/* ── Highlight colour ── */}
      <div className="relative flex-shrink-0">
        <BtnTooltip label="Highlight colour">
          <button
            type="button"
            className={ib(highlightOpen)}
            onMouseDown={(e) => e.preventDefault()}
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
            colors={HIGHLIGHT_COLORS}
            onSelect={(c) => {
              setLastHighlight(c || '#fef08a');
              onFormat(() => {
                if (!c) {
                  document.execCommand('styleWithCSS', false, 'true');
                  document.execCommand('hiliteColor', false, 'transparent');
                  document.execCommand('styleWithCSS', false, 'false');
                } else {
                  document.execCommand('styleWithCSS', false, 'true');
                  document.execCommand('hiliteColor', false, c);
                  document.execCommand('styleWithCSS', false, 'false');
                }
              });
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
          <button type="button" className={ib(false)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('outdent'))}>
            <span className="text-[14px] leading-none">⇤</span>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Increase indent">
          <button type="button" className={ib(false)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('indent'))}>
            <span className="text-[14px] leading-none">⇥</span>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Alignment ── */}
      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-slate-100/70 px-0.5 py-0.5">
        <BtnTooltip label="Align left">
          <button type="button" className={ib(formatState.alignLeft)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('justifyLeft'))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="9" height="2" rx="1"/><rect x="0" y="9" width="12" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Align centre">
          <button type="button" className={ib(formatState.alignCenter)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('justifyCenter'))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="2.5" y="5" width="9" height="2" rx="1"/><rect x="1" y="9" width="12" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Align right">
          <button type="button" className={ib(formatState.alignRight)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('justifyRight'))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="5" y="5" width="9" height="2" rx="1"/><rect x="2" y="9" width="12" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Lists ── */}
      <div className="flex flex-shrink-0 items-center gap-0.5 rounded-lg bg-slate-100/70 px-0.5 py-0.5">
        <BtnTooltip label="Bullet list">
          <button type="button" className={ib(formatState.unorderedList)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('insertUnorderedList'))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2" r="1.5"/><rect x="4" y="1" width="10" height="2" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6" width="10" height="2" rx="1"/><circle cx="1.5" cy="12" r="1.5"/><rect x="4" y="11" width="10" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
        <BtnTooltip label="Numbered list">
          <button type="button" className={ib(formatState.orderedList)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('insertOrderedList'))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" fontSize="4" fontFamily="monospace">1.</text><rect x="5" y="1" width="9" height="2" rx="1"/><text x="0" y="9" fontSize="4" fontFamily="monospace">2.</text><rect x="5" y="6" width="9" height="2" rx="1"/><text x="0" y="14" fontSize="4" fontFamily="monospace">3.</text><rect x="5" y="11" width="9" height="2" rx="1"/></svg>
          </button>
        </BtnTooltip>
      </div>

      <Sep />

      {/* ── Table ── */}
      <div className="relative flex-shrink-0">
        <BtnTooltip label="Insert table">
          <button
            type="button"
            className={ib(tablePickerOpen)}
            onMouseDown={(e) => e.preventDefault()}
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
          <TablePicker onInsert={onTableInsert} onClose={onTablePickerToggle} />
        )}
      </div>

      <Sep />

      {/* ── Image ── */}
      <BtnTooltip label="Insert image">
        <button
          type="button"
          className={ib(false)}
          onMouseDown={(e) => e.preventDefault()}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onImageWidth(mode)}
              >
                {mode === 'sm' ? 'S' : mode === 'md' ? 'M' : mode === 'lg' ? 'L' : 'Full'}
              </button>
            </BtnTooltip>
          ))}
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
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableCtx, setTableCtx] = useState<TableContext | null>(null);
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
    try { setFormatState(getFormatState()); } catch { /* ignore */ }
    setTableCtx(ref.current ? getTableContext(ref.current) : null);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshFormatState);
    return () => document.removeEventListener('selectionchange', refreshFormatState);
  }, [refreshFormatState]);

  const commitFromEditor = useCallback(() => {
    if (ref.current) onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
  }, [onCommit]);

  /** Run a format command, then re-focus the editor and commit. */
  const onFormat = useCallback((fn: () => void) => {
    ref.current?.focus();
    fn();
    refreshFormatState();
    commitFromEditor();
  }, [commitFromEditor, refreshFormatState]);

  /** Run a direct DOM table operation (no execCommand), then commit. */
  const onTableAction = useCallback((fn: () => void) => {
    fn();
    if (ref.current) onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
    setTableCtx(ref.current ? getTableContext(ref.current) : null);
  }, [onCommit]);

  const insertImageFromFile = async (file: File) => {
    const dataUrl = await compressImageFileToDataUrl(file);
    if (!dataUrl || !ref.current) return;
    insertHtmlIntoCaret(ref.current, `<img src="${dataUrl}" alt="" width="${IMG_WIDTH_MD}" />`);
    commitFromEditor();
  };

  const applyImageWidth = (mode: 'sm' | 'md' | 'lg' | 'full') => {
    const img = selectedImgRef.current;
    const root = ref.current;
    if (!img || !root?.contains(img)) return;
    if (mode === 'full') {
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

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const dt = e.clipboardData;
    if (!dt || !ref.current) return;

    const { files } = dt;
    if (files?.length) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          void insertImageFromFile(f);
          return;
        }
      }
    }

    const items = dt.items;
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            e.stopPropagation();
            void insertImageFromFile(f);
          }
          return;
        }
      }
    }

    const htmlRaw = dt.getData('text/html');
    const plain = dt.getData('text/plain') ?? '';

    if (htmlRaw && htmlRaw.trim().length > 0) {
      const cleaned = sanitizeProposalCustomBodyHtml(preCleanRichPasteHtml(htmlRaw));
      const probe = document.createElement('div');
      probe.innerHTML = cleaned;
      const textLen = (probe.textContent ?? '').replace(/\u00a0/g, ' ').trim().length;
      const meaningful =
        textLen > 0 ||
        !!probe.querySelector('img,table,ul,ol,a,h3,h4,blockquote');
      if (meaningful) {
        e.preventDefault();
        e.stopPropagation();
        insertHtmlIntoCaret(ref.current, cleaned);
        commitFromEditor();
        return;
      }
    }

    if (plain.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const escaped = plain
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const lines = escaped.split(/\r?\n/);
      const asHtml = lines.map((line) => `<p>${line.length ? line : '<br />'}</p>`).join('');
      insertHtmlIntoCaret(ref.current, asHtml);
      commitFromEditor();
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
        className="text-sm text-secondary-800 leading-relaxed space-y-2 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-semibold [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-secondary-200 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-secondary-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-secondary-50"
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
        formatState={formatState}
        onFormat={onFormat}
        tablePickerOpen={tablePickerOpen}
        onTablePickerToggle={() => setTablePickerOpen((v) => !v)}
        onTableInsert={(rows, cols) => {
          setTablePickerOpen(false);
          onFormat(() => insertHtmlIntoCaret(ref.current!, makeTable(rows, cols)));
        }}
      />

      {tableCtx && (
        <TableContextBar ctx={tableCtx} onTableAction={onTableAction} />
      )}

      <div
        ref={ref}
        className="min-h-[140px] bg-white px-3 py-2.5 text-sm text-secondary-800 focus:outline-none [&_a]:text-blue-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:border [&_img]:border-secondary-200 [&_table]:border-collapse [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-secondary-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-secondary-50"
        contentEditable
        suppressContentEditableWarning
        onMouseDown={(ev) => ev.stopPropagation()}
        onClick={onEditorClick}
        onKeyUp={refreshFormatState}
        onPaste={onPaste}
        onBlur={() => {
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
