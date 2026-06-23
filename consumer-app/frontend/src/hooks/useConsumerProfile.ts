import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from '@/utils/axios'
import type {
  ConsumerNotification,
  ConsumerProfile,
  UpdateProfileInput,
} from '@/types/profile'

export function useConsumerProfile() {
  return useQuery({
    queryKey: ['consumer-profile'],
    queryFn: async () => {
      const { data } = await axios.get<ConsumerProfile>('/api/consumer/profile')
      return data
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await axios.put<ConsumerProfile>('/api/consumer/profile', input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumer-profile'] })
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
