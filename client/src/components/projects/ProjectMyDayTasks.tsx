import { useState } from 'react'
import { Sun } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { useMyDayProjectTasksQuery } from '../../hooks/useMyDayProjectTasksQuery'
import { patchTask } from '../../lib/my-day-api'
import { applyMyDayTaskCompletionSideEffects } from '../../lib/myDayCompleteTask'
import {
  getLogRemarkOnCompletePref,
  setLogRemarkOnCompletePref,
} from '../../lib/myDayHabits'
import AddToMyDayButton from '../my-day/components/AddToMyDayButton'

interface Props {
  projectId: string
  projectLabel: string
}

export default function ProjectMyDayTasks({ projectId, projectLabel }: Props) {
  const { user } = useAuth()
  const { openTab } = useMyDayContext()
  const queryClient = useQueryClient()
  const tasksQ = useMyDayProjectTasksQuery(projectId)
  const [quickAdd, setQuickAdd] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [logRemark, setLogRemark] = useState(() =>
    user?.id ? getLogRemarkOnCompletePref(user.id) : true,
  )

  const tasks = tasksQ.data ?? []

  const handleComplete = async (taskId: string, content: string) => {
    if (completingId) return
    setCompletingId(taskId)
    try {
      await patchTask(taskId, { isDone: true })
      await applyMyDayTaskCompletionSideEffects(
        queryClient,
        { projectId, content },
        user?.id,
        logRemark,
      )
      await tasksQ.refetch()
    } catch {
      toast.error('Could not complete task')
    } finally {
      setCompletingId(null)
    }
  }

  return (
    <section
      className="mt-5 overflow-hidden rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)]"
      aria-labelledby="project-myday-heading"
    >
      <div className="flex flex-col gap-2 border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Sun className="h-5 w-5 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
          <div className="min-w-0">
            <h2
              id="project-myday-heading"
              className="text-xs font-bold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]"
            >
              Your open My Day tasks
            </h2>
            <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
              Pinned to this project — complete here or in the ☀ drawer
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openTab('tasks')}
          className="shrink-0 self-start rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-card-hover)] sm:self-center"
        >
          Open My Day
        </button>
      </div>

      <div className="px-4 py-4 sm:px-6">
        {tasksQ.isLoading ? (
          <p className="text-[13px] text-[color:var(--text-muted)]">Loading tasks…</p>
        ) : tasksQ.isError ? (
          <p className="text-[13px] text-[color:var(--accent-red)]">Could not load My Day tasks</p>
        ) : tasks.length === 0 ? (
          <p className="text-[13px] text-[color:var(--text-secondary)]">
            No open tasks for this project. Add a follow-up below or from Zenith Hit List.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--border-default)]">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  aria-label="Mark complete"
                  disabled={completingId === task.id}
                  onClick={() => handleComplete(task.id, task.content)}
                  className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[color:var(--border-strong)] transition-colors hover:border-[color:var(--accent-teal)] disabled:opacity-50"
                />
                <span className="min-w-0 flex-1 text-sm leading-snug text-[color:var(--text-primary)]">
                  {task.content}
                </span>
              </li>
            ))}
          </ul>
        )}

        {tasks.length > 0 ? (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
            <input
              type="checkbox"
              checked={logRemark}
              onChange={(e) => {
                const enabled = e.target.checked
                setLogRemark(enabled)
                if (user?.id) setLogRemarkOnCompletePref(user.id, enabled)
              }}
              className="rounded border-[color:var(--border-strong)]"
            />
            Log completions to project remarks
          </label>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder="Add a follow-up for this project…"
            className="min-h-[44px] flex-1 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--border-focus)]"
          />
          <AddToMyDayButton
            content={quickAdd}
            projectId={projectId}
            projectLabel={projectLabel}
            className="sm:shrink-0"
            usageEvent="task_added"
            disabled={!quickAdd.trim()}
            onSuccess={() => setQuickAdd('')}
          />
        </div>
      </div>
    </section>
  )
}
