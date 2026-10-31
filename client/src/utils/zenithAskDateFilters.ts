/** Live command-bar dates for Ask (set while Zenith is mounted; empty elsewhere). */
export type ZenithAskDateFilters = {
  fy: string[]
  quarter: string[]
  month: string[]
}

const EMPTY: ZenithAskDateFilters = { fy: [], quarter: [], month: [] }

let current: ZenithAskDateFilters = EMPTY

export function setZenithAskDateFilters(next: ZenithAskDateFilters | null): void {
  current = next
    ? {
        fy: [...next.fy],
        quarter: [...next.quarter],
        month: [...next.month],
      }
    : EMPTY
}

export function getZenithAskDateFilters(): ZenithAskDateFilters {
  return current
}
