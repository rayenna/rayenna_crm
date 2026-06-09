export const MY_DAY_PROJECT_TASKS_QUERY_KEY = 'my-day-tasks-project'

export function myDayProjectTasksQueryKey(projectId: string) {
  return [MY_DAY_PROJECT_TASKS_QUERY_KEY, projectId] as const
}
