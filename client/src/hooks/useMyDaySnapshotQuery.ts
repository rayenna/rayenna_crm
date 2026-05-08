import { useQuery } from '@tanstack/react-query'
import { fetchJournal, fetchReminders, fetchTasks } from '../lib/my-day-api'
import { buildMyDaySnapshot, MY_DAY_SNAPSHOT_QUERY_KEY } from '../lib/myDaySnapshot'

export function useMyDaySnapshotQuery(enabled: boolean) {
  return useQuery({
    queryKey: MY_DAY_SNAPSHOT_QUERY_KEY,
    queryFn: async () => {
      const [tasks, reminders, journal] = await Promise.all([
        fetchTasks(),
        fetchReminders(),
        fetchJournal(),
      ])
      return buildMyDaySnapshot(tasks, reminders, journal.today)
    },
    enabled,
    staleTime: 45_000,
  })
}
