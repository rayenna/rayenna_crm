/** Cover / title-page hero used across preview, PDF, DOCX, and PPT. */

export const COVER_HERO_SRC = '/proposal_cover_hero.jpg';

/**
 * Navy brand wash over the photo — keeps white cover text readable.
 * Slightly stronger than the old 0.58 so bright sky regions stay dark enough
 * for WhatsApp/Android PDF viewers (they often drop CSS-only overlays).
 */
export const COVER_HERO_OVERLAY_OPACITY = 0.68;

/**
 * Composite the cover hero with a navy wash baked into JPEG pixels.
 * Required for PPT/DOCX and for PDF/Share clones — many mobile PDF viewers
 * (e.g. WhatsApp Android) fail to paint separate CSS rgba overlays.
 */
export async function loadCoverHeroComposited(
  overlayOpacity: number = COVER_HERO_OVERLAY_OPACITY,
): Promise<{ dataUrl: string; arrayBuffer: ArrayBuffer } | null> {
  try {
    const resp = await fetch(COVER_HERO_SRC);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width;
    const h = bitmap.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    // Match HTML cover: navy gradient wash, slightly stronger on the left (copy side).
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `rgba(13, 27, 58, ${Math.min(1, overlayOpacity + 0.14)})`);
    grad.addColorStop(0.45, `rgba(13, 27, 58, ${overlayOpacity})`);
    grad.addColorStop(1, `rgba(13, 27, 58, ${Math.min(1, overlayOpacity + 0.1)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const bin = atob(dataUrl.split(',')[1] ?? '');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { dataUrl, arrayBuffer: bytes.buffer };
  } catch {
    return null;
  }
}

/**
 * Prepare a proposal DOM clone for PDF / Share: bake navy wash into the cover
 * hero image and remove the CSS-only wash layer so mobile PDF viewers stay readable.
 */
export async function applyCompositedCoverToClone(clone: HTMLElement): Promise<void> {
  const composited = await loadCoverHeroComposited();
  const hero = clone.querySelector<HTMLImageElement>('img[data-docx-image="cover-hero"]');
  if (hero && composited?.dataUrl) {
    hero.src = composited.dataUrl;
    hero.setAttribute('data-cover-baked', '1');
  }
  // CSS wash is redundant (and harmful) once pixels are baked — WhatsApp drops it.
  clone.querySelectorAll('[data-pdf-cover-wash]').forEach((n) => n.remove());
}

/**
 * Strip empty wrapper nodes that can force a trailing blank print page.
 * Keeps nodes that still carry section markers, media, or meaningful text.
 */
export function stripEmptyPrintWrappers(root: HTMLElement): void {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>('div:not([data-pdf-section]):not([data-pdf-keep]):not([data-docx-section])'),
  );
  // Remove deepest-first so nested empties collapse.
  candidates
    .sort((a, b) => depth(b) - depth(a))
    .forEach((el) => {
      if (el.closest('.print-hide')) return;
      if (el.querySelector('img, svg, table, canvas, video, [data-pdf-section], [data-docx-section], [data-pdf-keep]')) {
        return;
      }
      const text = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      if (text.length > 0) return;
      // Keep structural flex/grid parents that only exist as layout shells with children.
      if (el.children.length > 0) return;
      el.remove();
    });
}

function depth(el: HTMLElement): number {
  let d = 0;
  let n: HTMLElement | null = el;
  while (n) {
    d += 1;
    n = n.parentElement;
  }
  return d;
}
