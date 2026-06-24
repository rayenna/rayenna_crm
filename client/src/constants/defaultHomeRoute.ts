/** Post-login and `/` redirect — Zenith is the primary command centre. */
export const CRM_DEFAULT_HOME = '/zenith' as const

/** Leave Help (Esc): return to the page that opened Help, else Zenith. */
export function resolveHelpExitPath(referrerPath: string | null | undefined): string {
  if (referrerPath && referrerPath.startsWith('/')) return referrerPath
  return CRM_DEFAULT_HOME
}
