import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createTask, fetchTasks, MY_DAY_TASKS_QUERY_KEY } from '../../../lib/my-day-api'
import type { Task } from '../types'
import { MY_DAY_SNAPSHOT_QUERY_KEY } from '../../../lib/myDaySnapshot'
import { MY_DAY_SUGGESTIONS_QUERY_KEY } from '../../../hooks/useMyDaySuggestionsQuery'
import { myDayProjectTasksQueryKey } from '../../../lib/myDayProjectTasksQuery'
import { isOpenTaskDuplicate } from '../../../lib/myDayTaskDedup'
import { recordMyDayUsage, type MyDayUsageEvent } from '../../../lib/myDayHabits'
import { useAuth } from '../../../contexts/AuthContext'

interface Props {
  content: string
  projectId?: string | null
  projectLabel?: string | null
  /** Compact icon+label for table rows */
  compact?: boolean
  /** Shorter control for Zenith table rows (+ My Day beside Open →) */
  dense?: boolean
  className?: string
  usageEvent?: Extract<MyDayUsageEvent, 'pin_hit_list' | 'pin_suggestion' | 'task_added'>
  disabled?: boolean
  onSuccess?: () => void
}

function mergeTaskIntoCache(prev: Task[] | undefined, task: Task): Task[] {
  if (!prev?.length) return [task]
  if (prev.some((t) => t.id === task.id)) return prev
  if (isOpenTaskDuplicate(prev, { projectId: task.projectId, content: task.content })) return prev
  return [task, ...prev]
}

export default function AddToMyDayButton({
  content,
  projectId = null,
  projectLabel = null,
  compact = false,
  dense = false,
  className = '',
  usageEvent = 'pin_hit_list',
  disabled = false,
  onSuccess,
}: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [pinnedLocally, setPinnedLocally] = useState(false)

  const { data: tasks } = useQuery({
    queryKey: MY_DAY_TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 30_000,
  })

  const alreadyInMyDay = useMemo(
    () => (tasks ? isOpenTaskDuplicate(tasks, { projectId, content }) : false),
    [tasks, projectId, content],
  )

  const pinned = disabled || alreadyInMyDay || pinnedLocally

  useEffect(() => {
    setPinnedLocally(false)
  }, [projectId, content])

  const refreshAfterPin = async () => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: MY_DAY_SNAPSHOT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MY_DAY_SUGGESTIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MY_DAY_TASKS_QUERY_KEY }),
    ]
    if (projectId) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: myDayProjectTasksQueryKey(projectId) }),
      )
    }
    await Promise.all(invalidations)
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (adding || pinned || !content.trim()) return
    setAdding(true)
    try {
      const result = await createTask({ content: content.trim(), projectId, projectLabel })
      setPinnedLocally(true)
      queryClient.setQueryData<Task[]>(MY_DAY_TASKS_QUERY_KEY, (prev) =>
        mergeTaskIntoCache(prev, result),
      )
      if (!result.alreadyExists && user?.id) recordMyDayUsage(user.id, usageEvent)
      await refreshAfterPin()
      onSuccess?.()
      if (!result.alreadyExists) {
        toast.success('Added to My Day')
      }
    } catch {
      setPinnedLocally(false)
      toast.error('Could not add to My Day')
    } finally {
      setAdding(false)
    }
  }

  const compactPinnedClass =
    'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] cursor-default'
  const compactActiveClass =
    'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] hover:brightness-105'

  if (compact) {
    const sizeClass = dense
      ? 'min-h-[28px] px-2 py-0.5 text-[10px] leading-tight'
      : 'min-h-[36px] px-2.5 py-1 text-[11px]'

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={adding || pinned || !content.trim()}
        className={[
          'inline-flex shrink-0 items-center justify-center rounded-lg border font-bold transition-colors whitespace-nowrap',
          sizeClass,
          pinned && !adding ? compactPinnedClass : compactActiveClass,
          adding ? 'opacity-70' : '',
          className,
        ].join(' ')}
        aria-label={pinned ? 'Already in My Day' : 'Add to My Day'}
        title={pinned ? 'Already in My Day' : 'Add to My Day'}
      >
        {adding ? '…' : pinned ? '✓ My Day' : '+ My Day'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={adding || pinned || !content.trim()}
      className={[
        'myday-touch-target inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 text-sm font-bold transition-colors',
        pinned && !adding
          ? 'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] cursor-default'
          : 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] hover:brightness-105',
        adding ? 'opacity-70' : '',
        className,
      ].join(' ')}
      aria-label={pinned ? 'Already in My Day' : 'Add to My Day'}
      title={pinned ? 'Already in My Day' : 'Add to My Day'}
    >
      {adding ? 'Adding…' : pinned ? 'In My Day' : 'Add to My Day'}
    </button>
  )
}
