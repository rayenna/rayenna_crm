import type { QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Task } from '../components/my-day/types'
import { MY_DAY_SUGGESTIONS_QUERY_KEY } from '../hooks/useMyDaySuggestionsQuery'
import { MY_DAY_SNAPSHOT_QUERY_KEY } from './myDaySnapshot'
import { getLogRemarkOnCompletePref } from './myDayHabits'
import { postMyDayTaskCompletionRemark } from './myDayProjectRemark'
import { myDayProjectTasksQueryKey } from './myDayProjectTasksQuery'

export async function applyMyDayTaskCompletionSideEffects(
  queryClient: QueryClient,
  task: Pick<Task, 'projectId' | 'content'>,
  userId: string | undefined,
  logRemarkToProject?: boolean,
): Promise<void> {
  queryClient.invalidateQueries({ queryKey: MY_DAY_SNAPSHOT_QUERY_KEY })
  queryClient.invalidateQueries({ queryKey: MY_DAY_SUGGESTIONS_QUERY_KEY })

  if (!task.projectId) return

  queryClient.invalidateQueries({ queryKey: myDayProjectTasksQueryKey(task.projectId) })

  const shouldLog = logRemarkToProject ?? (userId ? getLogRemarkOnCompletePref(userId) : true)
  if (!shouldLog) return

  try {
    await postMyDayTaskCompletionRemark(task.projectId, task.content)
    queryClient.invalidateQueries({ queryKey: ['remarks', task.projectId] })
  } catch {
    toast.error('Task done — could not log to project remarks')
  }
}
