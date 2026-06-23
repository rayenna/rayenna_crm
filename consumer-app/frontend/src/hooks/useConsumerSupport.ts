import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from '@/utils/axios'
import type {
  LearnTipItem,
  SubmitSupportQueryInput,
  SupportFaqItem,
  SupportMeta,
  SupportTicketItem,
} from '@/types/support'

export function useSupportMeta() {
  return useQuery({
    queryKey: ['consumer-support-meta'],
    queryFn: async () => {
      const { data } = await axios.get<SupportMeta>('/api/consumer/support-meta')
      return data
    },
  })
}

export function useSupportFaq() {
  return useQuery({
    queryKey: ['consumer-support-faq'],
    queryFn: async () => {
      const { data } = await axios.get<{ faqs: SupportFaqItem[]; tips: LearnTipItem[] }>(
        '/api/consumer/faq',
      )
      return data
    },
  })
}

export function useSubmitSupportQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitSupportQueryInput) => {
      const { data } = await axios.post<SupportTicketItem>('/api/consumer/support-tickets', {
        subject: input.subject,
        description: input.description,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumer-support-tickets'] })
    },
  })
}
