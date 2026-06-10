import { useState, useCallback, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import type { Task, JournalEntry } from '../types'
import {
  fetchTasks,
  createTask,
  patchTask,
  deleteTask,
  fetchJournal,
  upsertJournal,
  fetchReminders,
  createReminder,
  MY_DAY_TASKS_QUERY_KEY,
} from '../../../lib/my-day-api'
import { MY_DAY_SNAPSHOT_QUERY_KEY } from '../../../lib/myDaySnapshot'
import { MY_DAY_SUGGESTIONS_QUERY_KEY } from '../../../hooks/useMyDaySuggestionsQuery'
import { recordMyDayUsage } from '../../../lib/myDayHabits'
import { findOpenTaskDuplicate, findOpenReminderDuplicate } from '../../../lib/myDayTaskDedup'
import { applyMyDayTaskCompletionSideEffects } from '../../../lib/myDayCompleteTask'
import { myDayProjectTasksQueryKey } from '../../../lib/myDayProjectTasksQuery'
import { useAuth } from '../../../contexts/AuthContext'

export type ToggleTaskOptions = { logRemarkToProject?: boolean }

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useMyDay() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const bumpSnapshot = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: MY_DAY_TASKS_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: MY_DAY_SNAPSHOT_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: MY_DAY_SUGGESTIONS_QUERY_KEY })
  }, [queryClient])

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    setTasksLoading(true)
    setTasksError(null)
    try {
      const data = await fetchTasks()
      setTasks(data)
    } catch {
      setTasksError('Failed to load tasks')
    } finally {
      setTasksLoading(false)
    }
  }, [])

  const toggleTask = useCallback(async (id: string, opts?: ToggleTaskOptions) => {
    let taskBefore: Task | undefined
    setTasks((prev) => {
      taskBefore = prev.find((t) => t.id === id)
      return prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t))
    })
    if (!taskBefore) return

    const markingComplete = !taskBefore.isDone

    try {
      const updated = await patchTask(id, { isDone: markingComplete })
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))

      if (markingComplete) {
        await applyMyDayTaskCompletionSideEffects(
          queryClient,
          taskBefore,
          user?.id,
          opts?.logRemarkToProject,
        )
      } else {
        bumpSnapshot()
        if (taskBefore.projectId) {
          queryClient.invalidateQueries({ queryKey: myDayProjectTasksQueryKey(taskBefore.projectId) })
        }
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t)),
      )
      toast.error('Failed to update task')
    }
  }, [bumpSnapshot, queryClient, user?.id])

  const addTask = useCallback(async (
    content: string,
    projectId?: string | null,
    projectLabel?: string | null,
  ) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const duplicate = findOpenTaskDuplicate(tasks, { projectId, content: trimmed })
    if (duplicate) {
      toast.success('Already in My Day')
      return
    }

    const optimistic: Task = {
      id: `opt-${Date.now()}`,
      content: trimmed,
      isDone: false,
      dueDate: null,
      isReminder: false,
      projectId: projectId ?? null,
      projectLabel: projectLabel ?? null,
      createdAt: new Date().toISOString(),
      sortOrder: tasks.length,
    }
    setTasks((prev) => [optimistic, ...prev])
    try {
      const created = await createTask({ content: trimmed, projectId, projectLabel })
      setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? created : t)))
      if (!created.alreadyExists && user?.id) recordMyDayUsage(user.id, 'task_added')
      bumpSnapshot()
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: myDayProjectTasksQueryKey(projectId) })
      }
      if (created.alreadyExists) toast.success('Already in My Day')
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== optimistic.id))
      toast.error('Failed to add task')
    }
  }, [tasks, tasks.length, bumpSnapshot, queryClient, user?.id])

  const removeTask = useCallback(async (id: string) => {
    const removed = tasks.find((t) => t.id === id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTask(id)
      bumpSnapshot()
    } catch {
      if (removed) setTasks((prev) => [removed, ...prev])
      toast.error('Failed to delete task')
    }
  }, [tasks, bumpSnapshot])

  const editTask = useCallback(async (id: string, content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    const prev = tasks.find((t) => t.id === id)
    if (!prev || prev.content === trimmed) return
    setTasks((prevList) =>
      prevList.map((t) => (t.id === id ? { ...t, content: trimmed } : t)),
    )
    try {
      const updated = await patchTask(id, { content: trimmed })
      setTasks((prevList) => prevList.map((t) => (t.id === id ? updated : t)))
      bumpSnapshot()
    } catch {
      if (prev) {
        setTasks((prevList) => prevList.map((t) => (t.id === id ? prev : t)))
      }
      toast.error('Failed to update task')
    }
  }, [tasks, bumpSnapshot])

  // ── Journal ─────────────────────────────────────────────────────────────────
  const [journalToday, setJournalToday] = useState<JournalEntry | null>(null)
  const [journalRecent, setJournalRecent] = useState<JournalEntry[]>([])
  const [journalRecentTotal, setJournalRecentTotal] = useState(0)
  const [journalLoading, setJournalLoading] = useState(false)
  const [journalLoadingMore, setJournalLoadingMore] = useState(false)
  const [journalSaveState, setJournalSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingJournalRef = useRef<{ content: string; projectId?: string | null; projectLabel?: string | null } | null>(null)

  const JOURNAL_PAGE = 10

  const loadJournal = useCallback(async () => {
    setJournalLoading(true)
    try {
      const data = await fetchJournal({ recentLimit: JOURNAL_PAGE, recentOffset: 0 })
      setJournalToday(data.today)
      setJournalRecent(data.recent)
      setJournalRecentTotal(data.recentTotal)
    } catch {
      toast.error('Failed to load journal')
    } finally {
      setJournalLoading(false)
    }
  }, [])

  const loadMoreJournal = useCallback(async () => {
    if (journalLoadingMore || journalRecent.length >= journalRecentTotal) return
    setJournalLoadingMore(true)
    try {
      const data = await fetchJournal({
        recentLimit: JOURNAL_PAGE,
        recentOffset: journalRecent.length,
      })
      setJournalRecent((prev) => {
        const seen = new Set(prev.map((e) => e.id))
        const next = data.recent.filter((e) => !seen.has(e.id))
        return [...prev, ...next]
      })
      setJournalRecentTotal(data.recentTotal)
    } catch {
      toast.error('Failed to load more entries')
    } finally {
      setJournalLoadingMore(false)
    }
  }, [journalLoadingMore, journalRecent.length, journalRecentTotal])

  const flushJournalSave = useCallback(async () => {
    if (!pendingJournalRef.current) return
    const { content, projectId, projectLabel } = pendingJournalRef.current
    pendingJournalRef.current = null
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setJournalSaveState('saving')
    try {
      const saved = await upsertJournal({ entryDate: todayISO(), content, projectId, projectLabel })
      setJournalToday(saved)
      setJournalSaveState('saved')
      bumpSnapshot()
      setTimeout(() => setJournalSaveState('idle'), 2000)
    } catch {
      setJournalSaveState('error')
    }
  }, [bumpSnapshot])

  const saveJournal = useCallback((
    content: string,
    projectId?: string | null,
    projectLabel?: string | null,
  ) => {
    // Optimistic local update
    setJournalToday((prev) =>
      prev
        ? { ...prev, content }
        : { id: '', entryDate: todayISO(), content, projectId: projectId ?? null, projectLabel: projectLabel ?? null, updatedAt: new Date().toISOString() },
    )
    pendingJournalRef.current = { content, projectId, projectLabel }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setJournalSaveState('saving')
      try {
        const saved = await upsertJournal({ entryDate: todayISO(), content, projectId, projectLabel })
        setJournalToday(saved)
        pendingJournalRef.current = null
        setJournalSaveState('saved')
        bumpSnapshot()
        setTimeout(() => setJournalSaveState('idle'), 2000)
      } catch {
        // retry once after 5s
        setJournalSaveState('error')
        setTimeout(async () => {
          if (pendingJournalRef.current) return // new change superseded
          try {
            const saved = await upsertJournal({ entryDate: todayISO(), content, projectId, projectLabel })
            setJournalToday(saved)
            setJournalSaveState('saved')
            bumpSnapshot()
            setTimeout(() => setJournalSaveState('idle'), 2000)
          } catch {
            setJournalSaveState('error')
          }
        }, 5000)
      }
    }, 2000)
  }, [bumpSnapshot])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Reminders ────────────────────────────────────────────────────────────────
  const [reminders, setReminders] = useState<Task[]>([])
  const [remindersLoading, setRemindersLoading] = useState(false)

  const loadReminders = useCallback(async () => {
    setRemindersLoading(true)
    try {
      const data = await fetchReminders()
      setReminders(data)
    } catch {
      toast.error('Failed to load reminders')
    } finally {
      setRemindersLoading(false)
    }
  }, [])

  const addReminder = useCallback(async (
    content: string,
    dueDate: string,
    projectId?: string | null,
    projectLabel?: string | null,
  ) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const duplicate = findOpenReminderDuplicate(reminders, {
      projectId,
      content: trimmed,
      dueDate,
    })
    if (duplicate) {
      toast.success('Reminder already set for this item')
      return
    }

    const optimistic: Task = {
      id: `opt-${Date.now()}`,
      content: trimmed,
      isDone: false,
      dueDate,
      isReminder: true,
      projectId: projectId ?? null,
      projectLabel: projectLabel ?? null,
      createdAt: new Date().toISOString(),
      sortOrder: 0,
    }
    setReminders((prev) => [...prev, optimistic].sort((a, b) =>
      (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
    ))
    try {
      const created = await createReminder({ content: trimmed, dueDate, projectId, projectLabel })
      setReminders((prev) => prev.map((r) => (r.id === optimistic.id ? created : r)))
      bumpSnapshot()
      if (created.alreadyExists) toast.success('Reminder already set for this item')
    } catch {
      setReminders((prev) => prev.filter((r) => r.id !== optimistic.id))
      toast.error('Failed to add reminder')
    }
  }, [reminders, bumpSnapshot])

  const removeReminder = useCallback(async (id: string) => {
    const removed = reminders.find((r) => r.id === id)
    setReminders((prev) => prev.filter((r) => r.id !== id))
    try {
      await deleteTask(id)
      bumpSnapshot()
    } catch {
      if (removed) setReminders((prev) => [...prev, removed])
      toast.error('Failed to delete reminder')
    }
  }, [reminders, bumpSnapshot])

  return {
    // tasks
    tasks,
    tasksLoading,
    tasksError,
    loadTasks,
    toggleTask,
    addTask,
    removeTask,
    editTask,
    // journal
    journalToday,
    journalRecent,
    journalRecentTotal,
    journalLoading,
    journalLoadingMore,
    journalSaveState,
    loadJournal,
    loadMoreJournal,
    saveJournal,
    flushJournalSave,
    // reminders
    reminders,
    remindersLoading,
    loadReminders,
    addReminder,
    removeReminder,
  }
}
