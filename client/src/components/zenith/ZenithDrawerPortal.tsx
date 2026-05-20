import { createPortal } from 'react-dom'

/** Portals Zenith quick drawers to document.body so fixed positioning is not trapped by .zenith-root. */
export default function ZenithDrawerPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
