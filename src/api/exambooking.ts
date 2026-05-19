import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import type {
  BookLRWRequest,
  BookSpeakingRequest,
  BookPackageRequest,
  BookingResponse,
  SlotAvailability,
} from '@/types/booking'
import { toast } from 'sonner'

// ============================================================
// Slot Availability
// ============================================================

export interface SlotAvailabilityParams {
  date: string
  type: 'lrw' | 'speaking'
}

export const useSlotAvailability = (params: SlotAvailabilityParams | null) => {
  return useQuery({
    queryKey: ['slot-availability', params],
    queryFn: async () => {
      if (!params) return { dates: [], slots: [] }
      const response = await api.get<{ success: boolean; data: Array<{
        id?: string
        time_slot?: string
        shift_slot?: string
        type?: string
        is_available?: boolean
      }> }>(
        '/api/v1/time-slots',
        { params: { date: params.date, type: params.type } }
      )
      const rows = unwrapApiData<Array<{
        id?: string
        time_slot?: string
        shift_slot?: string
        type?: string
        is_available?: boolean
      }>>(response.data)
      const slots: SlotAvailability[] = rows
        .filter((row) => !row.type || row.type === params.type)
        .map((row, idx) => {
        const range = (row.time_slot || '').split('-')
        const startTime = range[0] || '00:00'
        const endTime = range[1] || startTime
        const slotId = row.id ? String(row.id) : ''
        return {
          slot_id: slotId || String(idx + 1),
          teacher_id: '',
          teacher_name: '',
          time_slot: row.time_slot,
          shift_slot: row.shift_slot,
          start_time: `${params.date}T${startTime}:00Z`,
          end_time: `${params.date}T${endTime}:00Z`,
          available: row.is_available ?? true,
        }
      })
        .filter((slot) => slot.slot_id.length > 0)
      return { dates: [], slots }
    },
    enabled: !!params,
    staleTime: 30 * 1000,
  })
}

export const useAvailableDates = (type: 'lrw' | 'speaking', month?: string) => {
  return useQuery({
    queryKey: ['available-dates', type, month],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('type', type)
      if (month) params.set('month', month)
      const response = await api.get<{ success: boolean; data: Array<{ date: string }> }>(
        `/api/v1/time-slots/available-dates?${params.toString()}`
      )
      const rows = response.data?.data || []
      const seen = new Map<string, number>()
      rows.forEach((row) => {
        const d = row.date?.slice(0, 10)
        if (!d) return
        seen.set(d, (seen.get(d) || 0) + 1)
      })
      return Array.from(seen.entries()).map(([date, slot_count]) => ({
        date,
        has_slots: slot_count > 0,
        slot_count,
      }))
    },
    staleTime: 30 * 1000,
  })
}

// ============================================================
// Book LRW
// ============================================================

export const useBookLRW = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BookLRWRequest) => {
      const response = await api.post<{ data: BookingResponse }>(
        '/api/v1/exam-booking/lrw',
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('LRW exam booked successfully!')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to book LRW exam'
      toast.error(message)
    },
  })
}

// ============================================================
// Book Speaking
// ============================================================

export const useBookSpeaking = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BookSpeakingRequest) => {
      const response = await api.post<{ data: BookingResponse }>(
        '/api/v1/exam-booking/speaking',
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Speaking exam booked successfully!')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to book speaking exam'
      toast.error(message)
    },
  })
}

// ============================================================
// Book Package
// ============================================================

export const useBookPackage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BookPackageRequest) => {
      const response = await api.post<{ data: BookingResponse }>(
        '/api/v1/exam-booking/package',
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Full package booked successfully!')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to book package'
      toast.error(message)
    },
  })
}

// ============================================================
// Get Booking History
// ============================================================

export const useBookingHistory = (limit?: number) => {
  return useQuery({
    queryKey: ['booking-history', limit],
    queryFn: async () => {
      const url = limit
        ? `/api/v1/exam-bookings?limit=${limit}`
        : '/api/v1/exam-bookings'
      const response = await api.get<{ data: BookingResponse[] }>(url)
      return response.data.data
    },
    staleTime: 30 * 1000,
  })
}

export const useBooking = (bookingId: string) => {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await api.get<{ data: BookingResponse }>(
        `/api/v1/exam-bookings/${bookingId}`
      )
      return response.data.data
    },
    enabled: !!bookingId,
    staleTime: 30 * 1000,
  })
}

// ============================================================
// Cancel Booking
// ============================================================

export const useCancelBooking = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await api.delete<{ data: BookingResponse }>(
        `/api/v1/exam-bookings/${bookingId}`
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-history'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Booking cancelled successfully')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error.response?.data?.message || 'Failed to cancel booking'
      toast.error(message)
    },
  })
}
