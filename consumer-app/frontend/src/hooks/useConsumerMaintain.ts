import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from '@/utils/axios'
import type {
  CreateMaintenanceRequestInput,
  MaintenanceRequest,
  MaintenanceScheduleItem,
  WarrantyResponse,
} from '@/types/maintain'

export function useWarranty() {
  return useQuery({
    queryKey: ['consumer-warranty'],
    queryFn: async () => {
      const { data } = await axios.get<WarrantyResponse>('/api/consumer/warranty')
      return data
    },
  })
}

export function useMaintenanceSchedule() {
  return useQuery({
    queryKey: ['consumer-maintenance-schedule'],
    queryFn: async () => {
      const { data } = await axios.get<{ items: MaintenanceScheduleItem[] }>(
        '/api/consumer/maintenance-schedule',
      )
      return data.items
    },
  })
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateMaintenanceRequestInput) => {
      const { data } = await axios.post<MaintenanceRequest>(
        '/api/consumer/maintenance-requests',
        input,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumer-maintenance-requests'] })
      queryClient.invalidateQueries({ queryKey: ['consumer-warranty'] })
    },
  })
}
