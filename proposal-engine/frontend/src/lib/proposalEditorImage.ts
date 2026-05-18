/** Image wrap / align helpers for custom-section rich text (contentEditable). */

export type ImageWrapSide = 'left' | 'right';
export type ImageBlockAlign = 'left' | 'center' | 'right';

const CLASS_WRAP_LEFT = 'pe-img-wrap-l';
const CLASS_WRAP_RIGHT = 'pe-img-wrap-r';

function parseStyleMap(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  style
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((part) => {
      const i = part.indexOf(':');
      if (i === -1) return;
      const key = part.slice(0, i).trim().toLowerCase();
      const val = part.slice(i + 1).trim();
      if (key) out[key] = val;
    });
  return out;
}

function styleMapToString(map: Record<string, string>): string {
  return Object.entries(map)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/** Read float wrap side from class + inline style (survives save/sanitize). */
export function getImageWrapSide(img: HTMLImageElement): ImageWrapSide | null {
  if (img.classList.contains(CLASS_WRAP_LEFT)) return 'left';
  if (img.classList.contains(CLASS_WRAP_RIGHT)) return 'right';
  const fl = img.style.float || parseStyleMap(img.getAttribute('style') ?? '').float;
  if (fl === 'left') return 'left';
  if (fl === 'right') return 'right';
  return null;
}

export function isImageWrapEnabled(img: HTMLImageElement): boolean {
  return getImageWrapSide(img) != null;
}

/** True when S/M/L width is set — full-width images cannot wrap. */
export function imageSupportsTextWrap(img: HTMLImageElement): boolean {
  return img.hasAttribute('width');
}

function wrapMargin(side: ImageWrapSide): string {
  return side === 'left' ? '0 12px 8px 0' : '0 0 8px 12px';
}

function blockMargin(align: ImageBlockAlign): string {
  if (align === 'left') return '0 auto 8px 0';
  if (align === 'right') return '0 0 8px auto';
  return '0 auto 8px';
}

/** Apply or remove square text wrap (float). Preserves width/height attributes. */
export function setImageTextWrap(img: HTMLImageElement, side: ImageWrapSide | null): void {
  img.classList.remove(CLASS_WRAP_LEFT, CLASS_WRAP_RIGHT);
  const map = parseStyleMap(img.getAttribute('style') ?? '');
  delete map.float;
  delete map.clear;
  delete map.display;
  delete map.margin;
  delete map['margin-left'];
  delete map['margin-right'];

  if (side) {
    img.classList.add(side === 'left' ? CLASS_WRAP_LEFT : CLASS_WRAP_RIGHT);
    map.float = side;
    map.display = 'block';
    map.clear = 'none';
    map.margin = wrapMargin(side);
    img.style.cursor = 'move';
    img.style.touchAction = 'none';
  } else {
    map.float = 'none';
    map.display = 'block';
    map.clear = 'both';
    map.margin = blockMargin('center');
    img.style.cursor = '';
    img.style.touchAction = '';
  }

  const next = styleMapToString(map);
  if (next) img.setAttribute('style', next);
  else img.removeAttribute('style');
}

/** Block-level alignment (no text wrap) — existing toolbar behaviour. */
export function setImageBlockAlign(img: HTMLImageElement, align: ImageBlockAlign): void {
  if (getImageWrapSide(img)) {
    setImageTextWrap(img, align === 'right' ? 'right' : 'left');
    return;
  }
  img.classList.remove(CLASS_WRAP_LEFT, CLASS_WRAP_RIGHT);
  const map = parseStyleMap(img.getAttribute('style') ?? '');
  map.float = 'none';
  map.display = 'block';
  map.clear = 'both';
  map.margin = blockMargin(align);
  const next = styleMapToString(map);
  if (next) img.setAttribute('style', next);
  else img.removeAttribute('style');
}

export function toggleImageTextWrap(img: HTMLImageElement): ImageWrapSide | null {
  const cur = getImageWrapSide(img);
  if (cur) {
    setImageTextWrap(img, null);
    return null;
  }
  setImageTextWrap(img, 'left');
  return 'left';
}

export function caretRangeFromClientPoint(x: number, y: number): Range | null {
  const doc = document;
  if (typeof doc.caretRangeFromPoint === 'function') {
    try {
      return doc.caretRangeFromPoint(x, y);
    } catch {
      return null;
    }
  }
  const pos = (
    doc as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    }
  ).caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const range = doc.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}

/** Move image node to caret at (clientX, clientY) inside editor. */
export function moveImageToClientPoint(
  img: HTMLImageElement,
  editor: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const range = caretRangeFromClientPoint(clientX, clientY);
  if (!range) return false;

  const node =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentNode
      : range.startContainer;
  if (!node || !editor.contains(node)) return false;

  const parent = img.parentNode;
  if (parent) img.remove();

  try {
    range.collapse(true);
    range.insertNode(img);
    const spacer = document.createTextNode('\u200B');
    img.after(spacer);
    const sel = window.getSelection();
    if (sel) {
      const after = document.createRange();
      after.setStart(spacer, 1);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
    return true;
  } catch {
    editor.appendChild(img);
    return true;
  }
}

const DRAG_THRESHOLD_PX = 6;

/**
 * When text wrap is on, drag the image vertically in the flow so surrounding text reflows.
 * Returns cleanup for pointer listeners.
 */
export function attachWrappedImageDrag(
  img: HTMLImageElement,
  editor: HTMLElement,
  onMoved: () => void,
): () => void {
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let pointerId: number | null = null;

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!getImageWrapSide(img)) return;
    startX = e.clientX;
    startY = e.clientY;
    dragging = false;
    pointerId = e.pointerId;
    try {
      img.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    if (!dragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      img.style.opacity = '0.65';
    }
    e.preventDefault();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    img.style.opacity = '';
    try {
      img.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointerId = null;
    if (dragging) {
      moveImageToClientPoint(img, editor, e.clientX, e.clientY);
      onMoved();
    }
    dragging = false;
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    img.style.opacity = '';
    pointerId = null;
    dragging = false;
  };

  img.addEventListener('pointerdown', onPointerDown);
  img.addEventListener('pointermove', onPointerMove);
  img.addEventListener('pointerup', onPointerUp);
  img.addEventListener('pointercancel', onPointerCancel);

  return () => {
    img.removeEventListener('pointerdown', onPointerDown);
    img.removeEventListener('pointermove', onPointerMove);
    img.removeEventListener('pointerup', onPointerUp);
    img.removeEventListener('pointercancel', onPointerCancel);
    img.style.opacity = '';
    img.style.cursor = getImageWrapSide(img) ? 'move' : '';
  };
}
