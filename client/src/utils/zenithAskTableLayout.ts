/** Column heuristics for Ask Zenith mobile card layout. */

export const ASK_TABLE_TITLE_RE = /customer|name|title|label|project/i
export const ASK_TABLE_SERIAL_RE = /^(sl|serial|prj|#|no\.?|id)$/i
/** Prefer ₹ / money columns for the gold line on mobile cards. */
export const ASK_TABLE_EMPHASIS_STRONG_RE = /order|value|amount|revenue|pipeline|profit|cost/i
export const ASK_TABLE_EMPHASIS_SOFT_RE = /score/i

export type AskTableColumn = { key: string; label: string }

export function pickAskTableTitleColumn(columns: AskTableColumn[]): AskTableColumn | null {
  if (columns.length === 0) return null
  const byKey = columns.find(
    (c) => ASK_TABLE_TITLE_RE.test(c.key) || ASK_TABLE_TITLE_RE.test(c.label),
  )
  if (byKey) return byKey
  const nonSerial = columns.find(
    (c) => !ASK_TABLE_SERIAL_RE.test(c.key) && !ASK_TABLE_SERIAL_RE.test(c.label.trim()),
  )
  return nonSerial ?? columns[0] ?? null
}

export function pickAskTableEmphasisColumn(
  columns: AskTableColumn[],
  titleKey: string | null,
): AskTableColumn | null {
  const notTitle = (c: AskTableColumn) => c.key !== titleKey
  const strong = columns.find(
    (c) =>
      notTitle(c) &&
      (ASK_TABLE_EMPHASIS_STRONG_RE.test(c.key) || ASK_TABLE_EMPHASIS_STRONG_RE.test(c.label)),
  )
  if (strong) return strong
  return (
    columns.find(
      (c) =>
        notTitle(c) &&
        (ASK_TABLE_EMPHASIS_SOFT_RE.test(c.key) || ASK_TABLE_EMPHASIS_SOFT_RE.test(c.label)),
    ) ?? null
  )
}
