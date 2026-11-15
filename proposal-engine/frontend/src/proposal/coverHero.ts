/** Cover / title-page hero used across preview, PDF, DOCX, and PPT. */

export const COVER_HERO_SRC = '/proposal_cover_hero.jpg';

/** Navy brand wash over the photo — keeps white cover text readable (site-style). */
export const COVER_HERO_OVERLAY_OPACITY = 0.58;

/**
 * Composite the cover hero with a navy wash for PPT/DOCX (formats that cannot
 * layer CSS overlays the same way as HTML/PDF).
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
    grad.addColorStop(0, `rgba(13, 27, 58, ${Math.min(1, overlayOpacity + 0.12)})`);
    grad.addColorStop(0.45, `rgba(13, 27, 58, ${overlayOpacity})`);
    grad.addColorStop(1, `rgba(13, 27, 58, ${Math.min(1, overlayOpacity + 0.08)})`);
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
