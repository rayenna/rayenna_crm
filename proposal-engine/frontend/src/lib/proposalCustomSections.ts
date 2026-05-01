import type { ProposalCustomSectionBeforeBoq } from './customerStore';
import { sanitizeProposalCustomBodyHtml } from './sanitizeProposalCustomHtml';

/** Marker on DOM roots so saved `editedHtml` does not duplicate JSON-persisted sections. */
export const PE_MANAGED_SECTION_ATTR = 'data-pe-managed-section';
export const PE_MANAGED_BEFORE_BOQ = 'before-boq';

export function newCustomSectionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeMediaUrl(input: string): string | undefined {
  const t = input.trim();
  if (!t) return undefined;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return undefined;
  }
  if (u.protocol !== 'https:') return undefined;
  const host = u.hostname.toLowerCase();
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return u.toString();
  }
  if (/\.mp4($|[?#])/i.test(u.pathname)) return u.toString();
  return undefined;
}

export function sanitizeImageUrl(input: string): string | undefined {
  const t = input.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

/** YouTube embed URL for iframe, or null if not a supported YouTube link. */
export function youtubeEmbedFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const h = u.hostname.toLowerCase();
    if (h === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (h === 'youtube.com' || h.endsWith('.youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
      const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shorts?.[1]) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(shorts[1])}`;
      }
      const embed = u.pathname.match(/^\/embed\/([^/?#]+)/);
      if (embed?.[1]) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embed[1])}`;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isMp4MediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /\.mp4($|[?#])/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function normalizeCustomSectionsBeforeBoq(raw: unknown): ProposalCustomSectionBeforeBoq[] {
  if (!Array.isArray(raw)) return [];
  const out: ProposalCustomSectionBeforeBoq[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : newCustomSectionId();
    const title = typeof r.title === 'string' ? r.title.trim().slice(0, 240) : '';
    const rawBody = typeof r.bodyHtml === 'string' ? r.bodyHtml : '';
    const bodyHtml = sanitizeProposalCustomBodyHtml(rawBody);
    const mediaUrl = typeof r.mediaUrl === 'string' ? sanitizeMediaUrl(r.mediaUrl) : undefined;
    const mediaPosterUrl = typeof r.mediaPosterUrl === 'string' ? sanitizeImageUrl(r.mediaPosterUrl) : undefined;
    out.push({
      id,
      title,
      bodyHtml,
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(mediaPosterUrl ? { mediaPosterUrl } : {}),
    });
    if (out.length >= 20) break;
  }
  return out;
}

export function stripPeManagedSectionsFromDocHtml(html: string): string {
  if (typeof document === 'undefined') return html;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  wrap.querySelectorAll(`[${PE_MANAGED_SECTION_ATTR}="${PE_MANAGED_BEFORE_BOQ}"]`).forEach((el) => el.remove());
  return wrap.innerHTML;
}
