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

/** After open, scroll/focus note field in Quick Action (Installation Pulse "Log update"). */
export type ZenithAutoFocusSection = 'note' | null

export type ZenithQuickActionHandle = {
  isOpen: boolean
  project: QuickActionProjectRef | null
  listMode: boolean
  filterLabel: string
  filteredProjects: ZenithExplorerProject[]
  /** When set, list-mode footer shows “Open in Projects” with this href. */
  projectsPageHref: string | null
  /** FY profit drill-down uses gross profit; all other lists use order value. */
  listAmountMode: ZenithListAmountMode
  autoFocusSection: ZenithAutoFocusSection
  saving: boolean
  saveSuccess: boolean
  error: string | null
  openDrawer: (p: QuickActionProjectRef, autoFocusSection?: ZenithAutoFocusSection) => void
  openDrawerListMode: (args: {
    filterLabel: string
    filteredProjects: ZenithExplorerProject[]
    listAmountMode?: ZenithListAmountMode
    projectsPageHref?: string | null
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
  const [projectsPageHref, setProjectsPageHref] = useState<string | null>(null)
  const [listAmountMode, setListAmountMode] = useState<ZenithListAmountMode>('deal_value')
  const [autoFocusSection, setAutoFocusSection] = useState<ZenithAutoFocusSection>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openDrawer = useCallback((p: QuickActionProjectRef, focus: ZenithAutoFocusSection = null) => {
    setProject(p)
    setListMode(false)
    setFilteredProjects([])
    setProjectsPageHref(null)
    setListAmountMode('deal_value')
    setFilterLabel('')
    setAutoFocusSection(focus ?? null)
    setSaveSuccess(false)
    setError(null)
    setIsOpen(true)
  }, [])

  const openDrawerListMode = useCallback(
    (args: {
      filterLabel: string
      filteredProjects: ZenithExplorerProject[]
      listAmountMode?: ZenithListAmountMode
      projectsPageHref?: string | null
    }) => {
      setProject(null)
      setListMode(true)
      setFilterLabel(args.filterLabel)
      setFilteredProjects(args.filteredProjects)
      setProjectsPageHref(args.projectsPageHref ?? null)
      setListAmountMode(args.listAmountMode ?? 'deal_value')
      setAutoFocusSection(null)
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
    setProjectsPageHref(null)
    setListAmountMode('deal_value')
    setFilterLabel('')
    setAutoFocusSection(null)
    window.setTimeout(() => setProject(null), 300)
  }, [])

  return useMemo<ZenithQuickActionHandle>(
    () => ({
      isOpen,
      project,
      listMode,
      filterLabel,
      filteredProjects,
      projectsPageHref,
      listAmountMode,
      autoFocusSection,
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
      projectsPageHref,
      listAmountMode,
      autoFocusSection,
      saving,
      saveSuccess,
      error,
      openDrawer,
      openDrawerListMode,
      closeDrawer,
    ],
  )
}
