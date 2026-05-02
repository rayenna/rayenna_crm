import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'h3',
  'h4',
  'blockquote',
  'span',
  'div',
  'img',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
];

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'class',
  'style',
  'src',
  'alt',
  'width',
  'height',
  'colspan',
  'rowspan',
  'scope',
];

/** ~450 KB decoded image — keeps pasted screenshots reasonable vs proposal JSON limits */
const MAX_IMAGE_BYTES = 450_000;

const DATA_IMAGE_PREFIX = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;

const IMG_DIM_MIN = 8;
const IMG_DIM_MAX = 1400;

/** Exported for paste / attach guards before inserting into the editor. */
export function isSafeDataImageSrc(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return false;
  if (!DATA_IMAGE_PREFIX.test(src)) return false;
  if (src.length > 900_000) return false;
  const parts = src.split(',');
  const b64 = parts.length >= 2 ? parts.slice(1).join(',') : '';
  if (!b64) return false;
  try {
    const bin = atob(b64.replace(/\s/g, ''));
    return bin.length > 0 && bin.length <= MAX_IMAGE_BYTES;
  } catch {
    return false;
  }
}

/**
 * Strip Word / Outlook conditional blocks, Office XML tags, and problematic
 * inline CSS properties before handing off to DOMPurify.
 *
 * Key Word-paste issues this handles:
 * - mso-* properties (Office-specific, meaningless in browser)
 * - background / background-color (Word adds dark/black backgrounds that
 *   render as a black box inside the editor)
 * - windowtext / Windows-specific named colours
 * - Inch-based margins (margin: .5in etc.) that push content off-screen
 */
export function preCleanRichPasteHtml(html: string): string {
  return (
    html
      // Word conditional comments
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
      // Office XML namespaces (Word paste)
      .replace(/<\/?(?:o|w|v|m):\w+[^>]*>/gi, '')
      .replace(/<\/?font[^>]*>/gi, '')
      // Scrub each style="..." attribute to remove Office-specific / dangerous CSS
      .replace(/style="([^"]*)"/gi, (_match, styleContent: string) => {
        const cleaned = styleContent
          .split(';')
          .map((p) => p.trim())
          .filter((p) => {
            if (!p) return false;
            const lower = p.toLowerCase();
            if (lower.startsWith('mso-')) return false;          // Office-only props
            if (lower.startsWith('background')) return false;    // black-box culprit
            if (lower.includes('windowtext')) return false;      // Windows named colour
            if (/margin[^:]*:\s*[\d.]+in/i.test(p)) return false; // inch-based margins
            return true;
          })
          .join('; ')
          .trim();
        return cleaned ? `style="${cleaned}"` : '';
      })
  );
}

let domPurifyDataUriHookInstalled = false;

function ensureDomPurifyDataUriHook(): void {
  if (typeof window === 'undefined' || domPurifyDataUriHookInstalled) return;
  domPurifyDataUriHookInstalled = true;
  DOMPurify.addHook('uponSanitizeAttribute', (node, hookEvent) => {
    const evt = hookEvent as unknown as {
      attrName?: string;
      attrValue?: string;
      forceKeepAttr?: boolean;
    };
    if (node.tagName !== 'IMG' || evt.attrName !== 'src') return;
    const val = evt.attrValue ?? '';
    if (isSafeDataImageSrc(val)) {
      evt.forceKeepAttr = true;
    }
  });
}

function clampImgDimensions(container: HTMLElement): void {
  container.querySelectorAll('img').forEach((img) => {
    ['width', 'height'].forEach((attr) => {
      const v = img.getAttribute(attr);
      if (v == null || v === '') return;
      const s = String(v).trim();
      if (!/^\d+$/.test(s)) {
        img.removeAttribute(attr);
        return;
      }
      const n = parseInt(s, 10);
      if (!Number.isFinite(n) || n < IMG_DIM_MIN || n > IMG_DIM_MAX) {
        img.removeAttribute(attr);
      } else {
        img.setAttribute(attr, String(n));
      }
    });
  });
}

/** Remove Word/Google class noise; keeps markup predictable after paste. */
function stripRichPasteClasses(container: HTMLElement): void {
  container.querySelectorAll('[class]').forEach((el) => el.removeAttribute('class'));
}

function postProcessLinksAndImages(container: HTMLElement): void {
  container.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || !/^https:\/\//i.test(href)) {
      a.removeAttribute('href');
      return;
    }
    a.setAttribute('rel', 'noopener noreferrer');
    a.setAttribute('target', '_blank');
  });
  container.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (!src) {
      img.remove();
      return;
    }
    if (/^https:\/\//i.test(src)) return;
    if (!isSafeDataImageSrc(src)) img.remove();
  });
  clampImgDimensions(container);
  stripRichPasteClasses(container);
}

/** Sanitize pasted / edited HTML for custom proposal sections (browser only). */
export function sanitizeProposalCustomBodyHtml(dirty: string): string {
  if (typeof window === 'undefined') return '';
  ensureDomPurifyDataUriHook();
  const clean = DOMPurify.sanitize(dirty ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  const wrap = document.createElement('div');
  wrap.innerHTML = clean;
  postProcessLinksAndImages(wrap);
  return wrap.innerHTML;
}
