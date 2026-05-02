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
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
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
  };
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
      className="absolute z-50 top-full left-0 mt-1 bg-white border border-secondary-200 rounded-xl shadow-xl p-3 select-none"
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="text-[10px] font-semibold text-secondary-500 mb-2 text-center min-w-[120px]">
        {hover.r > 0 && hover.c > 0
          ? `${hover.c} column${hover.c > 1 ? 's' : ''} × ${hover.r} row${hover.r > 1 ? 's' : ''}`
          : 'Hover to choose size'}
      </p>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${PICKER_MAX}, 18px)` }}
      >
        {Array.from({ length: PICKER_MAX }, (_, r) =>
          Array.from({ length: PICKER_MAX }, (_, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-[18px] h-[18px] rounded-sm border cursor-pointer transition-colors ${
                r < hover.r && c < hover.c
                  ? 'bg-primary-300 border-primary-500'
                  : 'bg-secondary-100 border-secondary-300 hover:bg-primary-100 hover:border-primary-300'
              }`}
              onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
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
  const actionBtn =
    'text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors';
  const dangerBtn =
    'text-[10px] font-semibold px-2 py-0.5 rounded border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors';
  const sep = <span className="w-px h-4 bg-blue-200 flex-shrink-0" />;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/70 border-b border-blue-100 print-hide">
      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mr-0.5">Row</span>
      <button type="button" className={actionBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertRow(ctx, true))}  title="Insert row above">↑ Above</button>
      <button type="button" className={actionBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertRow(ctx, false))} title="Insert row below">↓ Below</button>
      <button type="button" className={dangerBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableDeleteRow(ctx))}         title="Delete this row">✕ Row</button>

      {sep}

      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mr-0.5">Col</span>
      <button type="button" className={actionBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertColumn(ctx, true))}  title="Insert column left">← Left</button>
      <button type="button" className={actionBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableInsertColumn(ctx, false))} title="Insert column right">→ Right</button>
      <button type="button" className={dangerBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => onTableAction(() => tableDeleteColumn(ctx))}        title="Delete this column">✕ Col</button>

      {sep}

      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mr-0.5">Width</span>
      {COL_WIDTHS.map((w) => (
        <button
          key={w.label}
          type="button"
          className={actionBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onTableAction(() => tableSetColumnWidth(ctx, w.value))}
          title={w.value ? `Set column width to ${w.value}` : 'Reset column width to auto'}
        >
          {w.label}
        </button>
      ))}
    </div>
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
  const tbBtn = (active: boolean) =>
    `min-w-[28px] h-7 px-1.5 rounded text-xs font-bold border transition-colors select-none ${
      active
        ? 'bg-primary-100 border-primary-400 text-primary-800'
        : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50'
    }`;

  const sep = <span className="w-px h-5 bg-secondary-200 mx-0.5 flex-shrink-0" />;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-secondary-200 bg-secondary-50 px-2 py-1.5 print-hide">
      {/* Font family */}
      <select
        className="h-7 rounded border border-secondary-300 bg-white px-1.5 text-xs text-secondary-800 focus:outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
        defaultValue=""
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = e.target.value;
          e.target.value = '';
          if (!v || !editorRef.current) return;
          onFormat(() => applyInlineStyle('font-family', v, editorRef.current!));
        }}
      >
        <option value="" disabled>Font</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="h-7 w-[68px] rounded border border-secondary-300 bg-white px-1 text-xs text-secondary-800 focus:outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
        defaultValue=""
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = e.target.value;
          e.target.value = '';
          if (!v || !editorRef.current) return;
          onFormat(() => applyInlineStyle('font-size', v, editorRef.current!));
        }}
      >
        <option value="" disabled>Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {sep}

      {/* Bold */}
      <button type="button" title="Bold (Ctrl+B)" className={tbBtn(formatState.bold)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('bold'))}>
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button type="button" title="Italic (Ctrl+I)" className={`${tbBtn(formatState.italic)} italic`} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('italic'))}>
        <em>I</em>
      </button>

      {/* Underline */}
      <button type="button" title="Underline (Ctrl+U)" className={`${tbBtn(formatState.underline)} underline`} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('underline'))}>
        U
      </button>

      {sep}

      {/* Align left */}
      <button type="button" title="Align left" className={tbBtn(formatState.alignLeft)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('justifyLeft'))}>
        &#8676;
      </button>

      {/* Align center */}
      <button type="button" title="Align center" className={tbBtn(formatState.alignCenter)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('justifyCenter'))}>
        &#8596;
      </button>

      {/* Align right */}
      <button type="button" title="Align right" className={tbBtn(formatState.alignRight)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('justifyRight'))}>
        &#8677;
      </button>

      {sep}

      {/* Bullet list */}
      <button type="button" title="Bullet list" className={tbBtn(formatState.unorderedList)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('insertUnorderedList'))}>
        &#8226;&#8212;
      </button>

      {/* Numbered list */}
      <button type="button" title="Numbered list" className={tbBtn(formatState.orderedList)} onMouseDown={(e) => e.preventDefault()} onClick={() => onFormat(() => cmd('insertOrderedList'))}>
        1.&#8212;
      </button>

      {sep}

      {/* Table — click opens grid picker */}
      <div className="relative">
        <button
          type="button"
          title="Insert table — choose size"
          className={tbBtn(tablePickerOpen)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onTablePickerToggle}
        >
          ⊞
        </button>
        {tablePickerOpen && (
          <TablePicker
            onInsert={onTableInsert}
            onClose={onTablePickerToggle}
          />
        )}
      </div>

      {sep}

      {/* Image */}
      <button type="button" title="Insert image" className={tbBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={onImageClick}>
        🖼
      </button>

      {/* Image width controls — only when an image is selected */}
      {selectedImg ? (
        <>
          {sep}
          <span className="text-[10px] font-semibold text-secondary-500">Img:</span>
          {(['sm', 'md', 'lg', 'full'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              title={mode === 'sm' ? '260px' : mode === 'md' ? '380px' : mode === 'lg' ? '560px' : 'Full width'}
              className={tbBtn(false)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onImageWidth(mode)}
            >
              {mode === 'sm' ? 'S' : mode === 'md' ? 'M' : mode === 'lg' ? 'L' : 'Full'}
            </button>
          ))}
        </>
      ) : null}
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
