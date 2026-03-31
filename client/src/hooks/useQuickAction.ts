import { useState } from 'react'

export type QuickActionProjectRef = {
  id: string
  customerName?: string
  stageLabel?: string
}

export function useQuickAction() {
  const [isOpen, setIsOpen] = useState(false)
  const [project, setProject] = useState<QuickActionProjectRef | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openDrawer = (p: QuickActionProjectRef) => {
    setProject(p)
    setSaveSuccess(false)
    setError(null)
    setIsOpen(true)
  }

  const closeDrawer = () => {
    setIsOpen(false)
    window.setTimeout(() => setProject(null), 300)
  }

  return {
    isOpen,
    project,
    saving,
    saveSuccess,
    error,
    openDrawer,
    closeDrawer,
    setSaving,
    setSaveSuccess,
    setError,
  }
}

