import { useState, useCallback, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
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
} from '../../../lib/my-day-api'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useMyDay() {
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

  const toggleTask = useCallback(async (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t)),
    )
    try {
      const updated = await patchTask(id, {
        isDone: !tasks.find((t) => t.id === id)?.isDone,
      })
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch {
      // revert
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t)),
      )
      toast.error('Failed to update task')
    }
  }, [tasks])

  const addTask = useCallback(async (
    content: string,
    projectId?: string | null,
    projectLabel?: string | null,
  ) => {
    const optimistic: Task = {
      id: `opt-${Date.now()}`,
      content,
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
      const created = await createTask({ content, projectId, projectLabel })
      setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? created : t)))
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== optimistic.id))
      toast.error('Failed to add task')
    }
  }, [tasks.length])

  const removeTask = useCallback(async (id: string) => {
    const removed = tasks.find((t) => t.id === id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTask(id)
    } catch {
      if (removed) setTasks((prev) => [removed, ...prev])
      toast.error('Failed to delete task')
    }
  }, [tasks])

  // ── Journal ─────────────────────────────────────────────────────────────────
  const [journalToday, setJournalToday] = useState<JournalEntry | null>(null)
  const [journalRecent, setJournalRecent] = useState<JournalEntry[]>([])
  const [journalLoading, setJournalLoading] = useState(false)
  const [journalSaveState, setJournalSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingJournalRef = useRef<{ content: string; projectId?: string | null; projectLabel?: string | null } | null>(null)

  const loadJournal = useCallback(async () => {
    setJournalLoading(true)
    try {
      const data = await fetchJournal()
      setJournalToday(data.today)
      setJournalRecent(data.recent)
    } catch {
      toast.error('Failed to load journal')
    } finally {
      setJournalLoading(false)
    }
  }, [])

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
      setTimeout(() => setJournalSaveState('idle'), 2000)
    } catch {
      setJournalSaveState('error')
    }
  }, [])

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
            setTimeout(() => setJournalSaveState('idle'), 2000)
          } catch {
            setJournalSaveState('error')
          }
        }, 5000)
      }
    }, 2000)
  }, [])

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
    const optimistic: Task = {
      id: `opt-${Date.now()}`,
      content,
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
      const created = await createReminder({ content, dueDate, projectId, projectLabel })
      setReminders((prev) => prev.map((r) => (r.id === optimistic.id ? created : r)))
    } catch {
      setReminders((prev) => prev.filter((r) => r.id !== optimistic.id))
      toast.error('Failed to add reminder')
    }
  }, [])

  const removeReminder = useCallback(async (id: string) => {
    const removed = reminders.find((r) => r.id === id)
    setReminders((prev) => prev.filter((r) => r.id !== id))
    try {
      await deleteTask(id)
    } catch {
      if (removed) setReminders((prev) => [...prev, removed])
      toast.error('Failed to delete reminder')
    }
  }, [reminders])

  return {
    // tasks
    tasks,
    tasksLoading,
    tasksError,
    loadTasks,
    toggleTask,
    addTask,
    removeTask,
    // journal
    journalToday,
    journalRecent,
    journalLoading,
    journalSaveState,
    loadJournal,
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
