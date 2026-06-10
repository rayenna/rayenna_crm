import type { Task } from '../components/my-day/types'

function normContent(content: string): string {
  return content.trim().toLowerCase()
}

/** Matches server open-task dedup — one open pin per project, or one per content when unpinned. */
export function findOpenTaskDuplicate(
  tasks: Task[],
  payload: { projectId?: string | null; content: string },
): Task | undefined {
  const open = tasks.filter((t) => !t.isDone && !t.isReminder)
  const projectId = payload.projectId?.trim() || null
  if (projectId) {
    return open.find((t) => t.projectId === projectId)
  }
  const key = normContent(payload.content)
  if (!key) return undefined
  return open.find((t) => !t.projectId && normContent(t.content) === key)
}

/** One open reminder per pinned project, or same content + due date when unpinned. */
export function findOpenReminderDuplicate(
  reminders: Task[],
  payload: { projectId?: string | null; content: string; dueDate: string },
): Task | undefined {
  const open = reminders.filter((r) => !r.isDone && r.isReminder)
  const projectId = payload.projectId?.trim() || null
  if (projectId) {
    return open.find((r) => r.projectId === projectId)
  }
  const key = normContent(payload.content)
  const due = payload.dueDate.slice(0, 10)
  return open.find(
    (r) => !r.projectId && normContent(r.content) === key && (r.dueDate ?? '').slice(0, 10) === due,
  )
}

export function isOpenTaskDuplicate(
  tasks: Task[],
  payload: { projectId?: string | null; content: string },
): boolean {
  return findOpenTaskDuplicate(tasks, payload) != null
}
