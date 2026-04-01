import { useCallback, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { ZenithExplorerProject } from '../types/zenithExplorer'

export type QuickActionProjectRef = {
  id: string
  customerName?: string
  stageLabel?: string
}

/** Passed from `Zenith` into `ZenithExecutiveBody` for drawer + chart drill-down. */
export type ZenithListAmountMode = 'deal_value' | 'gross_profit'

export type ZenithQuickActionHandle = {
  isOpen: boolean
  project: QuickActionProjectRef | null
  listMode: boolean
  filterLabel: string
  filteredProjects: ZenithExplorerProject[]
  /** FY profit drill-down uses gross profit; all other lists use order value. */
  listAmountMode: ZenithListAmountMode
  saving: boolean
  saveSuccess: boolean
  error: string | null
  openDrawer: (p: QuickActionProjectRef) => void
  openDrawerListMode: (args: {
    filterLabel: string
    filteredProjects: ZenithExplorerProject[]
    listAmountMode?: ZenithListAmountMode
  }) => void
  closeDrawer: () => void
  setSaving: Dispatch<SetStateAction<boolean>>
  setSaveSuccess: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
}

export function useQuickAction(): ZenithQuickActionHandle {
  const [isOpen, setIsOpen] = useState(false)
  const [project, setProject] = useState<QuickActionProjectRef | null>(null)
  const [listMode, setListMode] = useState(false)
  const [filterLabel, setFilterLabel] = useState('')
  const [filteredProjects, setFilteredProjects] = useState<ZenithExplorerProject[]>([])
  const [listAmountMode, setListAmountMode] = useState<ZenithListAmountMode>('deal_value')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openDrawer = useCallback((p: QuickActionProjectRef) => {
    setProject(p)
    setListMode(false)
    setFilteredProjects([])
    setListAmountMode('deal_value')
    setFilterLabel('')
    setSaveSuccess(false)
    setError(null)
    setIsOpen(true)
  }, [])

  const openDrawerListMode = useCallback(
    (args: {
      filterLabel: string
      filteredProjects: ZenithExplorerProject[]
      listAmountMode?: ZenithListAmountMode
    }) => {
      setProject(null)
      setListMode(true)
      setFilterLabel(args.filterLabel)
      setFilteredProjects(args.filteredProjects)
      setListAmountMode(args.listAmountMode ?? 'deal_value')
      setSaveSuccess(false)
      setError(null)
      setIsOpen(true)
    },
    [],
  )

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
    setListMode(false)
    setFilteredProjects([])
    setListAmountMode('deal_value')
    setFilterLabel('')
    window.setTimeout(() => setProject(null), 300)
  }, [])

  return useMemo<ZenithQuickActionHandle>(
    () => ({
      isOpen,
      project,
      listMode,
      filterLabel,
      filteredProjects,
      listAmountMode,
      saving,
      saveSuccess,
      error,
      openDrawer,
      openDrawerListMode,
      closeDrawer,
      setSaving,
      setSaveSuccess,
      setError,
    }),
    [
      isOpen,
      project,
      listMode,
      filterLabel,
      filteredProjects,
      listAmountMode,
      saving,
      saveSuccess,
      error,
      openDrawer,
      openDrawerListMode,
      closeDrawer,
    ],
  )
}
