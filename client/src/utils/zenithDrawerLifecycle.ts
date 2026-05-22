/** Remove body scroll lock left by Zenith portaled drawers (recovery after navigation / bfcache). */
export function clearZenithDrawerBodyLock(): void {
  if (typeof document === 'undefined') return
  document.body.classList.remove('zenith-drawer-open')
}
