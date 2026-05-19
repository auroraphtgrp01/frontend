import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import {
  mapApiAppointment,
  mapApiAppointmentDetail,
  type ApiAppointment,
} from '@/lib/appointment-mapping'
import type { Appointment, RescheduleQuota, RescheduleRequest } from '@/types/appointment'
import type { OrderAppointmentGroup, OrderStatus } from '@/types/order'
import type { PaginationMeta } from '@/types/index'
import { toast } from 'sonner'

// ============================================================
// My Appointments (User)
// ============================================================

export interface AppointmentFilters {
  status?: string
  exam_type?: string
  page?: number
  limit?: number
}

type ApiAppointmentOrderGroup = {
  order_id: string | number
  order_status?: string
  order_total?: number
  order_created_at?: string
  appointments?: ApiAppointment[]
}

type ApiPaginatedEnvelope<T> = {
  success?: boolean
  data?: T
  meta?: {
    pagination?: {
      page?: number
      per_page?: number
      total?: number
      total_pages?: number
      has_more?: boolean
    }
  }
}

function mapPagination(meta?: ApiPaginatedEnvelope<unknown>['meta']): PaginationMeta {
  const pagination = meta?.pagination
  return {
    page: pagination?.page ?? 1,
    page_size: pagination?.per_page ?? 20,
    total: pagination?.total ?? 0,
    total_pages: pagination?.total_pages,
    has_more: pagination?.has_more,
  }
}

function mapAppointmentListResponse(body: unknown) {
  const envelope = body as ApiPaginatedEnvelope<ApiAppointment[]>
  const rows = unwrapApiData<ApiAppointment[]>(body)
  return {
    data: rows.map(mapApiAppointment),
    meta: mapPagination(envelope.meta),
  }
}

function mapAppointmentOrderGroup(group: ApiAppointmentOrderGroup): OrderAppointmentGroup {
  return {
    order_id: String(group.order_id),
    order_status: group.order_status as OrderStatus | undefined,
    order_total: group.order_total,
    order_created_at: group.order_created_at,
    appointments: (group.appointments ?? []).map(mapApiAppointment),
  }
}

export const useMyAppointmentsByOrder = (filters?: AppointmentFilters) => {
  return useQuery({
    queryKey: ['my-appointments-by-order', filters],
    queryFn: async () => {
      const response = await api.get('/api/v1/appointments/me', {
        params: {
          group_by: 'order',
          page: filters?.page,
          per_page: filters?.limit,
        },
      })
      const groups = unwrapApiData<ApiAppointmentOrderGroup[]>(response.data)
      const envelope = response.data as ApiPaginatedEnvelope<ApiAppointmentOrderGroup[]>
      return {
        data: groups.map(mapAppointmentOrderGroup),
        meta: mapPagination(envelope.meta),
      }
    },
  })
}

export const useMyAppointments = (filters?: AppointmentFilters) => {
  return useQuery({
    queryKey: ['my-appointments', filters],
    queryFn: async () => {
      const response = await api.get('/api/v1/appointments/me', {
        params: {
          page: filters?.page,
          per_page: filters?.limit,
          status: filters?.status,
          exam_type: filters?.exam_type,
        },
      })
      return mapAppointmentListResponse(response.data)
    },
  })
}

export const useOrderAppointments = (orderId?: string) => {
  return useQuery({
    queryKey: ['order-appointments', orderId],
    queryFn: async () => {
      const response = await api.get('/api/v1/appointments/me', {
        params: { per_page: 100 },
      })
      const payload = mapAppointmentListResponse(response.data)
      return payload.data.filter((appointment) => appointment.order_id === orderId)
    },
    enabled: Boolean(orderId),
  })
}

// ============================================================
// Appointment Detail
// ============================================================

export const useAppointmentDetail = (appointmentId: string) => {
  return useQuery({
    queryKey: ['appointment-detail', appointmentId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/appointments/detail/${appointmentId}`)
      const detail = unwrapApiData<ApiAppointment>(response.data)
      return mapApiAppointmentDetail(detail)
    },
    enabled: !!appointmentId,
  })
}

// ============================================================
// Reschedule Quota
// ============================================================

export const useRescheduleQuota = (appointmentId: string) => {
  return useQuery({
    queryKey: ['reschedule-quota', appointmentId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/appointments/me/count-change/${appointmentId}`)
      const payload = unwrapApiData<{ remaining_changes?: number; total_changes?: number }>(
        response.data,
      )
      const mapped: RescheduleQuota = {
        remaining: payload.remaining_changes ?? 0,
        max_allowed: payload.total_changes ?? 0,
      }
      return mapped
    },
    enabled: !!appointmentId,
  })
}

// ============================================================
// Request Reschedule
// ============================================================

export const useRequestReschedule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      data,
    }: {
      appointmentId: string
      data: RescheduleRequest
    }) => {
      const response = await api.post(
        `/api/v1/appointments/me/request-change-date/${appointmentId}`,
        data,
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['order-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', variables.appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['reschedule-quota', variables.appointmentId] })
      toast.success('Reschedule request submitted successfully')
    },
    onError: () => {
      toast.error('Failed to submit reschedule request')
    },
  })
}

// ============================================================
// Update Appointment (Admin)
// ============================================================

export interface UpdateAppointmentRequest {
  status?: string
  appointment_date?: string
  time_slot?: string
  teacher_id?: string
  notes?: string
}

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      data,
    }: {
      appointmentId: string
      data: UpdateAppointmentRequest
    }) => {
      const response = await api.patch(`/api/v1/appointments/${appointmentId}`, data)
      return unwrapApiData<Appointment>(response.data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.appointmentId] })
      toast.success('Appointment updated successfully')
    },
    onError: () => {
      toast.error('Failed to update appointment')
    },
  })
}

// ============================================================
// Cancel Appointment
// ============================================================

export const useCancelAppointment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      await api.post(`/api/v1/appointments/me/cancel/${appointmentId}`)
    },
    onSuccess: (_, appointmentId) => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['order-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', appointmentId] })
      toast.success('Appointment cancelled successfully')
    },
    onError: () => {
      toast.error('Failed to cancel appointment')
    },
  })
}
