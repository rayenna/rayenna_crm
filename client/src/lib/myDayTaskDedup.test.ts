import { describe, expect, it } from 'vitest'
import type { Task } from '../components/my-day/types'
import {
  findOpenReminderDuplicate,
  findOpenTaskDuplicate,
  isOpenTaskDuplicate,
} from './myDayTaskDedup'

const base = (over: Partial<Task>): Task => ({
  id: '1',
  content: 'Follow up',
  isDone: false,
  dueDate: null,
  isReminder: false,
  projectId: null,
  projectLabel: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  sortOrder: 0,
  ...over,
})

describe('myDayTaskDedup', () => {
  it('blocks duplicate open task for same project', () => {
    const tasks = [base({ projectId: 'proj-a', content: 'Enter panel brand — MOHAMED' })]
    expect(isOpenTaskDuplicate(tasks, { projectId: 'proj-a', content: 'Different text' })).toBe(true)
  })

  it('allows new task when prior project task is done', () => {
    const tasks = [base({ projectId: 'proj-a', isDone: true })]
    expect(isOpenTaskDuplicate(tasks, { projectId: 'proj-a', content: 'Again' })).toBe(false)
  })

  it('dedupes unpinned tasks by normalized content', () => {
    const tasks = [base({ content: '  Buy cables  ' })]
    expect(findOpenTaskDuplicate(tasks, { content: 'buy cables' })).toBeDefined()
  })

  it('blocks duplicate open reminder for same project', () => {
    const reminders = [
      base({
        isReminder: true,
        dueDate: '2026-06-15',
        projectId: 'proj-b',
        content: 'Call customer',
      }),
    ]
    expect(
      findOpenReminderDuplicate(reminders, {
        projectId: 'proj-b',
        content: 'Other',
        dueDate: '2026-06-20',
      }),
    ).toBeDefined()
  })
})
