export const ZENITH_ASK_OPEN_EVENT = 'zenith-ask-open'

export type ZenithAskOpenDetail = {
  question?: string
  run?: boolean
  focus?: boolean
}

export function openZenithAskDock(detail: ZenithAskOpenDetail = {}): void {
  window.dispatchEvent(new CustomEvent(ZENITH_ASK_OPEN_EVENT, { detail }))
}
