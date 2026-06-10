import axiosInstance from '../utils/axios'
import type { Task, JournalEntry } from '../components/my-day/types'

/** Shared React Query key — invalidate after any task create/update/delete outside the drawer. */
export const MY_DAY_TASKS_QUERY_KEY = ['my-day', 'tasks'] as const

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const { data } = await axiosInstance.get<Task[]>('/api/my-day/tasks')
  return data
}

export async function fetchTasksForProject(projectId: string): Promise<Task[]> {
  const { data } = await axiosInstance.get<Task[]>(`/api/my-day/tasks/for-project/${projectId}`)
  return data
}

export async function createTask(payload: {
  content: string
  dueDate?: string | null
  isReminder?: boolean
  projectId?: string | null
  projectLabel?: string | null
}): Promise<Task & { alreadyExists?: boolean }> {
  const { data } = await axiosInstance.post<Task & { alreadyExists?: boolean }>('/api/my-day/tasks', payload)
  return data
}

export async function patchTask(
  id: string,
  payload: Partial<Pick<Task, 'isDone' | 'content' | 'sortOrder'>>,
): Promise<Task> {
  const { data } = await axiosInstance.patch<Task>(`/api/my-day/tasks/${id}`, payload)
  return data
}

export async function deleteTask(id: string): Promise<void> {
  await axiosInstance.delete(`/api/my-day/tasks/${id}`)
}

// ── Journal ───────────────────────────────────────────────────────────────────

export async function fetchJournal(opts?: {
  date?: string
  recentLimit?: number
  recentOffset?: number
}): Promise<{
  today: JournalEntry | null
  recent: JournalEntry[]
  recentTotal: number
}> {
  const params: Record<string, string | number> = {}
  if (opts?.date) params.date = opts.date
  if (opts?.recentLimit != null) params.recentLimit = opts.recentLimit
  if (opts?.recentOffset != null) params.recentOffset = opts.recentOffset
  const { data } = await axiosInstance.get<{
    today: JournalEntry | null
    recent: JournalEntry[]
    recentTotal: number
  }>('/api/my-day/journal', { params })
  return {
    today: data.today,
    recent: data.recent,
    recentTotal: data.recentTotal ?? data.recent.length,
  }
}

export async function upsertJournal(payload: {
  entryDate: string
  content: string
  projectId?: string | null
  projectLabel?: string | null
}): Promise<JournalEntry> {
  const { data } = await axiosInstance.post<JournalEntry>('/api/my-day/journal', payload)
  return data
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export async function fetchReminders(): Promise<Task[]> {
  const { data } = await axiosInstance.get<Task[]>('/api/my-day/reminders')
  return data
}

export async function createReminder(payload: {
  content: string
  dueDate: string
  projectId?: string | null
  projectLabel?: string | null
}): Promise<Task & { alreadyExists?: boolean }> {
  const { data } = await axiosInstance.post<Task & { alreadyExists?: boolean }>('/api/my-day/reminders', payload)
  return data
}

export async function patchReminder(
  id: string,
  payload: Partial<Pick<Task, 'isDone'>>,
): Promise<Task> {
  const { data } = await axiosInstance.patch<Task>(`/api/my-day/tasks/${id}`, payload)
  return data
}
