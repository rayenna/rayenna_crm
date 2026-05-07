export interface Task {
  id: string
  content: string
  isDone: boolean
  dueDate: string | null
  isReminder: boolean
  projectId: string | null
  projectLabel: string | null
  createdAt: string
  sortOrder: number
}

export interface JournalEntry {
  id: string
  entryDate: string        // YYYY-MM-DD
  content: string
  projectId: string | null
  projectLabel: string | null
  updatedAt: string
}

export type Reminder = Task  // reminders are tasks with isReminder: true and a dueDate

export interface PinOption {
  id: string
  label: string
}
