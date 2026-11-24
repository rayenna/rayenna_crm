/**
 * Mobile toolbar touch helpers for the Proposal Engine custom-section editor.
 *
 * Android Chrome: preventDefault on toolbar touchstart keeps the keyboard up and
 * preserves the contenteditable selection.
 *
 * iOS Safari: the same preventDefault often suppresses the synthetic click, so
 * list / format buttons feel erratic (only work on long-press). Skip it on Apple
 * touch devices; button-level onPointerDown={preventDefault} still keeps selection.
 */

export function isAppleTouchDevice(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator,
): boolean {
  if (/iPad|iPhone|iPod/i.test(nav.userAgent)) return true;
  // iPadOS 13+ reports as MacIntel with touch
  return nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
}

/** Whether the toolbar container should call preventDefault on touchstart. */
export function shouldPreventToolbarTouchDefault(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator,
): boolean {
  return !isAppleTouchDevice(nav);
}
