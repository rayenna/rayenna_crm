/** Zenith dashboard queries — avoid repeat full API loads when revisiting within 2 minutes. */
export const ZENITH_QUERY_STALE_MS = 120_000

/** CommandBar chips update immediately; query keys wait this long so rapid FY/Qtr/Mo clicks collapse. */
export const ZENITH_FILTER_DEBOUNCE_MS = 180
