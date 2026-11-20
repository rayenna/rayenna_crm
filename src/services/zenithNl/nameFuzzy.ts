/**
 * Fuzzy person-name matching for Ask Zenith lookups.
 * Handles spelling variants common in CRM (e.g. AhmedUni / Ahmed Unni ≈ Ahammedunni).
 */

export function normalizePersonNameKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/** Vowels stripped + repeated consonants collapsed — good for Indian name spelling drift. */
export function consonantSkeleton(s: string): string {
  const key = normalizePersonNameKey(s).replace(/[aeiou]/g, '');
  return key.replace(/(.)\1+/g, '$1');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const cur = new Array<number>(cols);
  for (let j = 0; j < cols; j++) prev[j] = j;
  for (let i = 1; i < rows; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j < cols; j++) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}

function diceBigram(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.slice(i, i + 2);
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.slice(i, i + 2);
    const n = counts.get(g) || 0;
    if (n > 0) {
      overlap += 1;
      counts.set(g, n - 1);
    }
  }
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

/**
 * Substring bonus only when the shorter side is a real name fragment —
 * never treat "N" inside "ahmedunni" as a strong match.
 */
function meaningfulSubstringScore(q: string, c: string): number {
  const shorter = Math.min(q.length, c.length);
  const longer = Math.max(q.length, c.length);
  if (shorter < 4) return 0;
  if (!(c.includes(q) || q.includes(c))) return 0;
  const ratio = shorter / longer;
  // Query contained in candidate (or vice versa) with enough shared length.
  if (ratio < 0.45 && shorter < 6) return 0.55 + 0.2 * ratio;
  return 0.88 + 0.12 * ratio;
}

/** Similarity in [0, 1]. Higher = closer spelling / pronunciation. */
export function nameSimilarity(query: string, candidate: string): number {
  const q = normalizePersonNameKey(query);
  const c = normalizePersonNameKey(candidate);
  if (!q || !c) return 0;
  // Ignore junk / initials-only CRM names as fuzzy targets.
  if (c.length < 3) return 0;
  if (q === c) return 1;

  const sub = meaningfulSubstringScore(q, c);
  let score = sub;

  const skQ = consonantSkeleton(query);
  const skC = consonantSkeleton(candidate);
  if (skQ.length >= 3 && skC.length >= 3) {
    if (skQ === skC) score = Math.max(score, 0.92);
    else {
      const skRatio = 1 - levenshtein(skQ, skC) / Math.max(skQ.length, skC.length);
      score = Math.max(score, skRatio * 0.9);
    }
  }

  const editRatio = 1 - levenshtein(q, c) / Math.max(q.length, c.length);
  const dice = diceBigram(q, c);
  score = Math.max(score, editRatio * 0.96, dice);

  const lenRatio = Math.min(q.length, c.length) / Math.max(q.length, c.length);
  // Strong length penalty when candidate is tiny vs query (blocks "N", "K", "Ali" noise).
  const lengthGate = c.length + 1 >= Math.ceil(q.length * 0.5) ? 1 : 0.35;
  return Math.max(0, Math.min(1, score * (0.82 + 0.18 * lenRatio) * lengthGate));
}

export type RankedNameMatch<T> = { item: T; name: string; score: number };

/** Best similarity across several name fields (first / full / last). */
export function bestNameSimilarity(query: string, names: Array<string | null | undefined>): {
  score: number;
  name: string;
} {
  let best = { score: 0, name: '' };
  const seen = new Set<string>();
  for (const raw of names) {
    const name = raw?.trim() || '';
    if (!name || name === 'Unknown') continue;
    const key = normalizePersonNameKey(name);
    if (!key || key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    const score = nameSimilarity(query, name);
    if (score > best.score) best = { score, name };
  }
  return best;
}

/**
 * Rank candidates by name similarity. Drops weak matches.
 * `minScore` default ~0.62 catches AhmedUni ↔ Ahammedunni without single-letter noise.
 * Prefer `getNames` when firstName can be an initial while customerName is the real name.
 */
export function rankNameMatches<T>(
  query: string,
  candidates: T[],
  getName: (item: T) => string,
  opts?: {
    minScore?: number;
    limit?: number;
    /** Return all name variants to score; best wins per candidate. */
    getNames?: (item: T) => Array<string | null | undefined>;
  },
): RankedNameMatch<T>[] {
  const minScore = opts?.minScore ?? 0.62;
  const limit = opts?.limit ?? 5;
  const q = query.trim();
  if (!q || normalizePersonNameKey(q).length < 3) return [];

  const scored: RankedNameMatch<T>[] = [];
  const seenItems = new Set<T>();
  for (const item of candidates) {
    if (seenItems.has(item)) continue;
    seenItems.add(item);
    const names = opts?.getNames?.(item) ?? [getName(item)];
    const { score, name } = bestNameSimilarity(q, names);
    if (!name || score < minScore) continue;
    scored.push({ item, name, score });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}

/** Strong enough to auto-open without asking (clear winner). */
export function isConfidentNameMatch(matches: RankedNameMatch<unknown>[]): boolean {
  if (matches.length === 0) return false;
  const best = matches[0]!;
  const bestKey = normalizePersonNameKey(best.name);
  if (bestKey.length < 4) return false;
  if (best.score >= 0.9) return true;
  if (best.score < 0.8) return false;
  const second = matches[1]?.score ?? 0;
  return best.score - second >= 0.1;
}
