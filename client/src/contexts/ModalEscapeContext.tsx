import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

type StackEntry = { id: number; cancel: () => void }

const ModalEscapeContext = createContext<{
  registerModalEscape: (cancel: () => void) => () => void
} | null>(null)

let nextId = 0

export function ModalEscapeProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<StackEntry[]>([])

  const registerModalEscape = useCallback((cancel: () => void) => {
    const id = nextId++
    stackRef.current = [...stackRef.current, { id, cancel }]
    return () => {
      stackRef.current = stackRef.current.filter((e) => e.id !== id)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const stack = stackRef.current
      if (stack.length === 0) return
      const snapshot = [...stack].reverse()
      stackRef.current = []
      for (const { cancel } of snapshot) {
        try {
          cancel()
        } catch {
          // ignore
        }
      }
      e.preventDefault()
      e.stopPropagation()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const value = useMemo(() => ({ registerModalEscape }), [registerModalEscape])

  return <ModalEscapeContext.Provider value={value}>{children}</ModalEscapeContext.Provider>
}

function useModalEscapeContextValue() {
  const ctx = useContext(ModalEscapeContext)
  if (!ctx) {
    throw new Error('useModalEscape must be used within ModalEscapeProvider')
  }
  return ctx
}

/**
 * When `open` is true, registers a dismiss handler invoked on Escape (batched with other open modals:
 * last-opened / innermost runs first). Use the same callback you would use for Cancel / backdrop dismiss.
 */
export function useModalEscape(open: boolean, onCancel: () => void) {
  const { registerModalEscape } = useModalEscapeContextValue()
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return
    return registerModalEscape(() => {
      onCancelRef.current()
    })
  }, [open, registerModalEscape])
}
