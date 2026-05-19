import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import { parseTimeSlotRange } from '@/lib/time-slot'
import type {
  TimeSlot,
  CreateTimeSlotBatch,
  UpdateTimeSlotRequest,
  TimeSlotFilters,
} from '@/types/scheduling'
import { toast } from 'sonner'

interface ApiTimeSlot {
  id: string
  feedback?: string
  type?: string
  shift_slot?: string
  time_slot?: string
  is_available?: boolean
}

function mapApiTimeSlot(row: ApiTimeSlot, filters?: TimeSlotFilters): TimeSlot {
  const { start, end } = parseTimeSlotRange(row.time_slot)
  const isAvailable = row.is_available ?? true

  return {
    id: String(row.id),
    date: filters?.date,
    time_slot: row.time_slot,
    start_time: start || undefined,
    end_time: end || undefined,
    feedback: row.feedback,
    type: row.type,
    shift_slot: row.shift_slot,
    capacity: 0,
    booked: 0,
    available: isAvailable ? 1 : 0,
    is_active: isAvailable,
  }
}

// ============================================================
// Get Time Slots
// ============================================================

export const useTimeSlots = (filters?: TimeSlotFilters) => {
  return useQuery({
    queryKey: ['time-slots', filters],
    queryFn: async () => {
      const response = await api.get('/api/v1/time-slots', {
        params: filters,
      })
      const rows = unwrapApiData<ApiTimeSlot[]>(response.data)
      const data = rows.map((row) => mapApiTimeSlot(row, filters))
      return {
        data,
        meta: {
          total: data.length,
          page: filters?.page ?? 1,
          per_page: filters?.limit ?? data.length,
          total_pages: 1,
        },
      }
    },
  })
}

// ============================================================
// Get Time Slot by ID
// ============================================================

export const useTimeSlot = (id: string) => {
  return useQuery({
    queryKey: ['time-slot', id],
    queryFn: async () => {
      const response = await api.get<{ data: TimeSlot }>(`/api/v1/time-slots/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

// ============================================================
// Get Time Slot Count
// ============================================================

export const useTimeSlotCount = (filters?: Omit<TimeSlotFilters, 'page' | 'limit'>) => {
  return useQuery({
    queryKey: ['time-slot-count', filters],
    queryFn: async () => {
      const response = await api.get<{ data: { count: number } }>('/api/v1/time-slots/count', {
        params: filters,
      })
      return response.data.data
    },
  })
}

// ============================================================
// Create Batch Time Slots
// ============================================================

export const useCreateBatchTimeSlots = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTimeSlotBatch[]) => {
      const response = await api.post<{ data: TimeSlot[]; message?: string }>(
        '/api/v1/time-slots/batch',
        data
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] })
      queryClient.invalidateQueries({ queryKey: ['time-slot-count'] })
      toast.success(data.message || `Created ${data.data?.length || 0} time slots successfully`)
    },
    onError: () => {
      toast.error('Failed to create time slots')
    },
  })
}

// ============================================================
// Update Time Slot
// ============================================================

export const useUpdateTimeSlot = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTimeSlotRequest }) => {
      const response = await api.patch<{ data: TimeSlot }>(`/api/v1/time-slots/${id}`, data)
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] })
      queryClient.invalidateQueries({ queryKey: ['time-slot', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['time-slot-count'] })
      toast.success('Time slot updated successfully')
    },
    onError: () => {
      toast.error('Failed to update time slot')
    },
  })
}

// ============================================================
// Delete Time Slot
// ============================================================

export const useDeleteTimeSlot = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/time-slots/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] })
      queryClient.invalidateQueries({ queryKey: ['time-slot-count'] })
      toast.success('Time slot deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete time slot')
    },
  })
}

// ============================================================
// Delete Expired Time Slots
// ============================================================

export const useDeleteExpiredTimeSlots = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete<{ message: string }>('/api/v1/time-slots/expired')
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['time-slots'] })
      queryClient.invalidateQueries({ queryKey: ['time-slot-count'] })
      toast.success(data.message || 'Expired time slots deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete expired time slots')
    },
  })
}
