import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type {
  GradingQueueItem,
  GradingReview,
  GradingSubmission,
  SkillType,
} from '@/types/exam'
import { toast } from 'sonner'

// ============================================================
// Grading Queue (for teacher/admin)
// ============================================================

export const useGradingQueue = (filters?: { skill_type?: SkillType; status?: string }) => {
  return useQuery({
    queryKey: ['grading-queue', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.skill_type) params.set('skill_type', filters.skill_type)
      if (filters?.status) params.set('status', filters.status)
      const query = params.toString()
      const response = await api.get<{ data: GradingQueueItem[] }>(
        `/api/v1/grading/review${query ? `?${query}` : ''}`
      )
      return response.data.data
    },
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
  })
}

// ============================================================
// Grading Review Detail
// ============================================================

export const useGradingReview = (attemptId: string, skillType: SkillType) => {
  return useQuery({
    queryKey: ['grading-review', attemptId, skillType],
    queryFn: async () => {
      const response = await api.get<{ data: GradingReview }>(
        `/api/v1/grading/review/${attemptId}/${skillType}`
      )
      return response.data.data
    },
    enabled: !!attemptId && !!skillType,
    staleTime: 10 * 1000,
  })
}

// ============================================================
// Submit Grading
// ============================================================

export const useSubmitGrading = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: GradingSubmission) => {
      const response = await api.post('/api/v1/grading/review', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-queue'] })
      queryClient.invalidateQueries({ queryKey: ['grading-review'] })
      toast.success('Grading submitted successfully')
    },
    onError: () => {
      toast.error('Failed to submit grading')
    },
  })
}
