import type { ReactNode } from 'react'
import { isValidElement } from 'react'

/** Plain text from React markdown heading children (strings, elements, arrays). */
export function textFromChildren(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromChildren).join('')
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode }
    if (props.children != null) return textFromChildren(props.children)
  }
  return ''
}

/** URL fragment for in-page anchors (stable, ASCII, hyphenated). */
export function slugifyHeadingLabel(text: string): string {
  const trimmed = text.trim()
  // Apostrophes (ASCII and curly) are word-internal — avoid `today-s-plan` from "Today's plan".
  const apostropheNormalized = trimmed.replace(/['\u2019]/g, '')
  const leadingStripped = apostropheNormalized.replace(/^[^\p{L}\p{N}]+/u, '').trim() || apostropheNormalized
  const slug = leadingStripped
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'section'
}
