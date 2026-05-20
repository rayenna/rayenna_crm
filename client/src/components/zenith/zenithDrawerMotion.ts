/** Quick drawer panel motion — slides in from the right (all viewports; reliable on mobile DevTools/PWA). */
export function zenithDrawerMotion(isOpen: boolean) {
  return {
    initial: false as const,
    animate: { x: isOpen ? 0 : '100%' },
    transition: { type: 'spring' as const, damping: 32, stiffness: 320 },
  }
}

export const ZENITH_DRAWER_PANEL_CLASS =
  'zenith-quick-drawer-panel fixed top-0 right-0 bottom-0 z-[6001] flex flex-col overflow-hidden h-[100dvh] w-full max-w-full sm:max-w-[min(100vw,420px)] lg:w-[420px] lg:max-w-[420px]'

export const ZENITH_DRAWER_CLOSE_BTN_CLASS =
  'zenith-drawer-close-btn shrink-0 rounded-full bg-[color:var(--bg-badge)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)] transition-colors touch-manipulation flex items-center justify-center text-xl leading-none'
