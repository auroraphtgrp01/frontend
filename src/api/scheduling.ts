import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type {
  SchedulingDay,
  SchedulingSlot,
  CreateSchedulingDayRequest,
  TimeSlotFilters,
} from '@/types/scheduling'
import type { PaginatedResponse } from '@/types'
import { toast } from 'sonner'

// ============================================================
// Get Scheduling Slots
// ============================================================

export const useSchedulingSlots = (filters?: TimeSlotFilters) => {
  return useQuery({
    queryKey: ['scheduling-slots', filters],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<SchedulingSlot>>(
        '/api/v1/scheduling/slots',
        {
          params: filters,
        }
      )
      return response.data
    },
  })
}

// ============================================================
// Check Register Availability
// ============================================================

export const useCheckRegister = () => {
  return useQuery({
    queryKey: ['check-register'],
    queryFn: async () => {
      const response = await api.get<{
        data: {
          can_register: boolean
          message?: string
          available_dates?: string[]
        }
      }>('/api/v1/scheduling/days/check-register')
      return response.data.data
    },
  })
}

// ============================================================
// Get Scheduling Days
// ============================================================

export const useSchedulingDays = (filters?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['scheduling-days', filters],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<SchedulingDay>>('/api/v1/scheduling/days', {
        params: filters,
      })
      return response.data
    },
  })
}

// ============================================================
// Get Scheduling Day by ID
// ============================================================

export const useSchedulingDay = (id: string) => {
  return useQuery({
    queryKey: ['scheduling-day', id],
    queryFn: async () => {
      const response = await api.get<{ data: SchedulingDay }>(`/api/v1/scheduling/days/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

// ============================================================
// Create Scheduling Day
// ============================================================

export const useCreateSchedulingDay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSchedulingDayRequest) => {
      const response = await api.post<{ data: SchedulingDay; message?: string }>(
        '/api/v1/scheduling/days',
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-days'] })
      queryClient.invalidateQueries({ queryKey: ['check-register'] })
      toast.success('Scheduling day created successfully')
    },
    onError: () => {
      toast.error('Failed to create scheduling day')
    },
  })
}

// ============================================================
// Update Scheduling Day
// ============================================================

export const useUpdateSchedulingDay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<CreateSchedulingDayRequest>
    }) => {
      const response = await api.patch<{ data: SchedulingDay }>(
        `/api/v1/scheduling/days/${id}`,
        data
      )
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-days'] })
      queryClient.invalidateQueries({ queryKey: ['scheduling-day', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['check-register'] })
      toast.success('Scheduling day updated successfully')
    },
    onError: () => {
      toast.error('Failed to update scheduling day')
    },
  })
}

// ============================================================
// Delete Scheduling Day
// ============================================================

export const useDeleteSchedulingDay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/scheduling/days/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-days'] })
      queryClient.invalidateQueries({ queryKey: ['check-register'] })
      toast.success('Scheduling day deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete scheduling day')
    },
  })
}
