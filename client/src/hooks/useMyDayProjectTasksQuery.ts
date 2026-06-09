import { useQuery } from '@tanstack/react-query'
import { fetchTasksForProject } from '../lib/my-day-api'
import { myDayProjectTasksQueryKey } from '../lib/myDayProjectTasksQuery'

export function useMyDayProjectTasksQuery(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: myDayProjectTasksQueryKey(projectId ?? ''),
    queryFn: () => fetchTasksForProject(projectId!),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
  })
}
