import { scopeSectionsFor } from './proposalCopy';
import type { TextOverrides } from './types';

/** Prefer a non-empty trimmed override; otherwise fallback. */
export function ov(
  map: TextOverrides | Record<string, string | undefined> | undefined,
  key: string,
  fallback: string,
): string {
  const v = map?.[key]?.trim();
  return v || fallback;
}

/** Prefer newline-split override lines for list sections; otherwise fallback. */
export function ovLines(
  map: TextOverrides | Record<string, string | undefined> | undefined,
  key: string,
  fallbackLines: string[],
): string[] {
  const v = map?.[key]?.trim();
  if (!v) return fallbackLines;
  const lines = v.split('\n').map((t) => t.trim()).filter(Boolean);
  return lines.length > 0 ? lines : fallbackLines;
}

/** Scope cards with Edit overrides for title + bullet lines applied. */
export function resolveScopeSectionsForExport(
  systemType: string | null | undefined,
  overrides?: TextOverrides | Record<string, string | undefined>,
) {
  return scopeSectionsFor(systemType).map((sec, i) => ({
    ...sec,
    title: ov(overrides, `scope-section-${i}-title`, sec.title),
    items: ovLines(overrides, `scope-section-${i}`, sec.items),
  }));
}
