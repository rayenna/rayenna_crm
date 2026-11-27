import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import {
  DEFAULT_ASK_PREFERENCES,
  normalizeAskPreferences,
  readZenithAskPreferences,
  writeZenithAskPreferences,
  type ZenithAskPreferences,
} from '../utils/zenithAskPreferencesStorage'

export const ZENITH_ASK_PREFS_QUERY_KEY = ['zenith-ask-preferences'] as const

export function useZenithAskPreferences(userId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient()
  const [local, setLocal] = useState<ZenithAskPreferences>(() =>
    readZenithAskPreferences(userId),
  )

  useEffect(() => {
    setLocal(readZenithAskPreferences(userId))
  }, [userId])

  const q = useQuery({
    queryKey: [...ZENITH_ASK_PREFS_QUERY_KEY, userId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        preferences?: unknown
        playbooks?: string[]
      }>('/api/dashboard/zenith-ask-preferences')
      const prefs = normalizeAskPreferences(data.preferences)
      writeZenithAskPreferences(userId, prefs)
      return {
        preferences: prefs,
        playbooks: Array.isArray(data.playbooks)
          ? data.playbooks.filter((p) => typeof p === 'string' && p.trim())
          : [],
      }
    },
    enabled: Boolean(userId && enabled),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (q.data?.preferences) setLocal(q.data.preferences)
  }, [q.data?.preferences])

  const setPreferences = useCallback(
    (next: ZenithAskPreferences) => {
      setLocal(next)
      writeZenithAskPreferences(userId, next)
      queryClient.setQueryData([...ZENITH_ASK_PREFS_QUERY_KEY, userId], (prev: unknown) => {
        const p =
          prev && typeof prev === 'object'
            ? (prev as { preferences?: ZenithAskPreferences; playbooks?: string[] })
            : {}
        return { ...p, preferences: next, playbooks: p.playbooks ?? q.data?.playbooks ?? [] }
      })
    },
    [queryClient, q.data?.playbooks, userId],
  )

  return {
    preferences: local ?? DEFAULT_ASK_PREFERENCES,
    setPreferences,
    playbooks: q.data?.playbooks ?? [],
    isLoading: q.isLoading,
  }
}
