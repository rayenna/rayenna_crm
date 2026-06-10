import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createTask, fetchTasks, MY_DAY_TASKS_QUERY_KEY } from '../../../lib/my-day-api'
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
  className?: string
  usageEvent?: Extract<MyDayUsageEvent, 'pin_hit_list' | 'pin_suggestion' | 'task_added'>
  disabled?: boolean
  onSuccess?: () => void
}

export default function AddToMyDayButton({
  content,
  projectId = null,
  projectLabel = null,
  compact = false,
  className = '',
  usageEvent = 'pin_hit_list',
  disabled = false,
  onSuccess,
}: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)

  const { data: tasks } = useQuery({
    queryKey: MY_DAY_TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 30_000,
  })

  const alreadyInMyDay = useMemo(
    () => (tasks ? isOpenTaskDuplicate(tasks, { projectId, content }) : false),
    [tasks, projectId, content],
  )

  const pinned = disabled || alreadyInMyDay

  const invalidateAfterPin = async () => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: MY_DAY_TASKS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MY_DAY_SNAPSHOT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MY_DAY_SUGGESTIONS_QUERY_KEY }),
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
      if (!result.alreadyExists && user?.id) recordMyDayUsage(user.id, usageEvent)
      await invalidateAfterPin()
      onSuccess?.()
      toast.success(result.alreadyExists ? 'Already in My Day' : 'Added to My Day')
    } catch {
      toast.error('Could not add to My Day')
    } finally {
      setAdding(false)
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={adding || pinned || !content.trim()}
        className={[
          'inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors',
          'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]',
          'hover:brightness-105 disabled:opacity-60',
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
        'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]',
        'hover:brightness-105 disabled:opacity-60',
        className,
      ].join(' ')}
    >
      {adding ? 'Adding…' : pinned ? 'In My Day' : 'Add to My Day'}
    </button>
  )
}
