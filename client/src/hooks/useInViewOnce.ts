import { useEffect, useRef, useState, type RefCallback } from 'react'

/** True once the element has intersected the viewport (stays true). */
export function useInViewOnce(rootMargin = '120px 0px'): {
  ref: RefCallback<HTMLDivElement>
  seen: boolean
} {
  const [seen, setSeen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const setRef = (el: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el || seen) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0.01 },
    )
    observerRef.current = io
    io.observe(el)
  }

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return { ref: setRef, seen }
}
