import { useQuery } from '@tanstack/react-query'
import axios from '@/utils/axios'
import type { ConsumerHome } from '@/types/home'

export function useConsumerHome() {
  return useQuery({
    queryKey: ['consumer-home'],
    queryFn: async () => {
      const { data } = await axios.get<ConsumerHome>('/api/consumer/home')
      return data
    },
  })
}
