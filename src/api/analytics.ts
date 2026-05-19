import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

// ============================================================
// Platform Stats
// ============================================================

export interface PlatformStats {
  total_academies: number
  active_academies: number
  total_users: number
  total_orders: number
  total_exams: number
  pending_gradings: number
  monthly_revenue: number
  revenue_change: number
  exams_this_month: number
  exams_change: number
}

export const usePlatformStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const response = await api.get<{ data: PlatformStats }>('/api/v1/admin/stats')
      return response.data.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// ============================================================
// Academy Stats
// ============================================================

export interface AcademyStats {
  academy_id: string
  academy_name: string
  academy_slug: string
  total_users: number
  active_users: number
  total_exams: number
  total_orders: number
  total_revenue: number
  pending_gradings: number
}

export const useAcademyStats = (
  academyId?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['academy-stats', academyId],
    queryFn: async () => {
      const url = academyId
        ? `/api/v1/admin/academies/${academyId}/stats`
        : '/api/v1/admin/academies/stats'
      const response = await api.get<{ data: AcademyStats[] }>(url)
      return response.data.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// ============================================================
// Revenue Stats
// ============================================================

export interface RevenueStats {
  total_revenue: number
  monthly_revenue: number[]
  revenue_by_academy: { name: string; revenue: number }[]
  revenue_by_product: { name: string; revenue: number }[]
  recent_orders: {
    id: string
    user_name: string
    academy_name: string
    amount: number
    created_at: string
  }[]
}

export const useRevenueStats = (period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month') => {
  return useQuery({
    queryKey: ['revenue-stats', period],
    queryFn: async () => {
      const response = await api.get<{ data: RevenueStats }>(`/api/v1/admin/revenue?period=${period}`)
      return response.data.data
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// ============================================================
// Exam Stats
// ============================================================

export interface ExamStats {
  total_attempts: number
  attempts_this_month: number[]
  attempts_by_academy: { name: string; attempts: number }[]
  average_band: number
  band_distribution: { band: number; count: number }[]
  skill_breakdown: {
    skill: string
    average_band: number
    total_attempts: number
  }[]
}

export const useExamStats = (period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month') => {
  return useQuery({
    queryKey: ['exam-stats', period],
    queryFn: async () => {
      const response = await api.get<{ data: ExamStats }>(`/api/v1/admin/exam-stats?period=${period}`)
      return response.data.data
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// ============================================================
// Activity Log
// ============================================================

export interface ActivityItem {
  id: string
  type: 'user_registered' | 'order_created' | 'exam_completed' | 'grading_submitted' | 'academy_created'
  message: string
  user_name?: string
  academy_name?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ActivityLog {
  items: ActivityItem[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export const useActivityLog = (params?: {
  page?: number
  page_size?: number
  type?: string
}) => {
  return useQuery({
    queryKey: ['activity-log', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.page_size) searchParams.set('page_size', String(params.page_size))
      if (params?.type) searchParams.set('type', params.type)
      const query = searchParams.toString()
      const response = await api.get<{ data: ActivityLog }>(
        `/api/v1/admin/activity${query ? `?${query}` : ''}`
      )
      return response.data.data
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}
