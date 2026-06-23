import { useQuery } from '@tanstack/react-query'
import axios from '@/utils/axios'
import type { AnnualEnergyResponse, EnergyReading } from '@/types/energy'

export function useMonthlyEnergy(year: number, month: number) {
  return useQuery({
    queryKey: ['consumer-energy', year, month],
    queryFn: async () => {
      const { data } = await axios.get<EnergyReading>('/api/consumer/energy', {
        params: { year, month },
      })
      return data
    },
  })
}

export function useAnnualEnergy(year: number, enabled = true) {
  return useQuery({
    queryKey: ['consumer-energy-annual', year],
    queryFn: async () => {
      const { data } = await axios.get<AnnualEnergyResponse>('/api/consumer/energy/annual', {
        params: { year },
      })
      return data
    },
    enabled,
  })
}
