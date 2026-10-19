import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios, {
  persistConsumerToken,
  readRememberPreference,
  setConsumerAuthToken,
} from '@/utils/axios'
import type {
  ChangePasswordInput,
  ConsumerNotification,
  ConsumerProfile,
} from '@/types/profile'
import type { ConsumerUser } from '@/types'

export function useConsumerProfile() {
  return useQuery({
    queryKey: ['consumer-profile'],
    queryFn: async () => {
      const { data } = await axios.get<ConsumerProfile>('/api/consumer/profile')
      return data
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const { data } = await axios.post<{
        ok: boolean
        token?: string
        user?: ConsumerUser
      }>('/api/consumer/auth/change-password', input)
      // Persist rotated JWT so this device stays signed in; other sessions are revoked.
      if (data?.token) {
        persistConsumerToken(data.token, readRememberPreference())
        setConsumerAuthToken(data.token)
      }
      return data
    },
  })
}

export function useConsumerNotifications() {
  return useQuery({
    queryKey: ['consumer-notifications'],
    queryFn: async () => {
      const { data } = await axios.get<{ items: ConsumerNotification[]; unreadCount: number }>(
        '/api/consumer/notifications',
      )
      return data
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.put<ConsumerNotification>(
        `/api/consumer/notifications/${id}/read`,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumer-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['consumer-home'] })
    },
  })
}
