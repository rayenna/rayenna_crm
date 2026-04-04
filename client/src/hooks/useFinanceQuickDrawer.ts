import { useCallback, useState } from 'react'

export function useFinanceQuickDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)

  const open = useCallback((id: string) => {
    setProjectId(id)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setProjectId(null)
  }, [])

  return { isOpen, projectId, open, close }
}
