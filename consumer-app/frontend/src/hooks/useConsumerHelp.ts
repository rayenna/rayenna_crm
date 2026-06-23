import { useQuery } from '@tanstack/react-query'
import axios from '@/utils/axios'
import type { HelpArticle, HelpContextPayload, HelpContextScreen, HelpPayload } from '@/types/help'

export function useConsumerHelp() {
  return useQuery({
    queryKey: ['consumer-help'],
    queryFn: async () => {
      const { data } = await axios.get<HelpPayload>('/api/consumer/help')
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useConsumerHelpArticle(articleId: string | undefined) {
  return useQuery({
    queryKey: ['consumer-help-article', articleId],
    enabled: Boolean(articleId),
    queryFn: async () => {
      const { data } = await axios.get<HelpArticle>(
        `/api/consumer/help/articles/${encodeURIComponent(articleId!)}`,
      )
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useConsumerHelpContext(screen: HelpContextScreen) {
  return useQuery({
    queryKey: ['consumer-help-context', screen],
    queryFn: async () => {
      const { data } = await axios.get<HelpContextPayload>(
        `/api/consumer/help/context?screen=${encodeURIComponent(screen)}`,
      )
      return data
    },
    staleTime: 2 * 60_000,
  })
}
