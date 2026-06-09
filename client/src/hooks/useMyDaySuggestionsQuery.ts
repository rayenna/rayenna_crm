import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../utils/axios'
import { fetchTasks } from '../lib/my-day-api'
import { buildMyDaySuggestions } from '../lib/myDaySuggestions'

export const MY_DAY_SUGGESTIONS_QUERY_KEY = ['my-day-suggestions'] as const

/** CRM-backed follow-up suggestions (zenith-focus + existing tasks for dedup). */
export function useMyDaySuggestionsQuery(enabled: boolean) {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...MY_DAY_SUGGESTIONS_QUERY_KEY, user?.id],
    queryFn: async () => {
      const [focusRes, tasks] = await Promise.all([
        axiosInstance.get('/api/dashboard/zenith-focus'),
        fetchTasks(),
      ])
      return buildMyDaySuggestions({
        focusData: focusRes.data,
        tasks,
        role: user!.role,
        userId: user!.id,
      })
    },
    enabled: enabled && !!user?.id,
    staleTime: 60_000,
    retry: 1,
  })
}
