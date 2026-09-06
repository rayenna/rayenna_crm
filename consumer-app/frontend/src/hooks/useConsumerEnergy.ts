import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useLogMonthlyEnergy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { year: number; month: number; totalGenerated: number }) => {
      const { data } = await axios.post<EnergyReading>('/api/consumer/energy/log', input)
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['consumer-energy', vars.year, vars.month] })
      queryClient.invalidateQueries({ queryKey: ['consumer-energy-annual', vars.year] })
      queryClient.invalidateQueries({ queryKey: ['consumer-home'] })
    },
  })
}
