export function toNum(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

export function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Normalise a raw cell value to a trimmed string */
export function cellStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}
