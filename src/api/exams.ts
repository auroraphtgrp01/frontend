import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query'
import api from '@/lib/axios'
import type {
  Exam,
  ExamDetail,
  ExamAttempt,
  ExamMode,
  ExamRegistrySummary,
  ExamPlayPresign,
  ExamMigrationJob,
} from '@/types/exam'
import { toast } from 'sonner'

// ============================================================
// Exam List & Detail
// ============================================================

export interface ExamFilters {
  type?: string
  mode?: ExamMode
  q?: string
  limit?: number
  cursor?: string
  /** Registry publish workflow (`publish`, `private`, …) — exam-service query param `status` */
  status?: string
}

export const useExams = (filters: ExamFilters = {}) => {
  return useQuery({
    queryKey: ['exams', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.mode) params.set('mode', filters.mode)
      if (filters.q) params.set('q', filters.q)
      if (filters.limit) params.set('limit', String(filters.limit))
      if (filters.cursor) params.set('cursor', filters.cursor)
      if (filters.status) params.set('status', filters.status)
      const query = params.toString()
      const response = await api.get<{ data: Exam[] }>(
        `/api/v1/exams${query ? `?${query}` : ''}`
      )
      return response.data
    },
    staleTime: 30 * 1000,
  })
}

export const useExam = (examId: string) => {
  return useQuery({
    queryKey: ['exam', examId],
    queryFn: async () => {
      const response = await api.get<{ data: ExamDetail }>(`/api/v1/exams/${examId}`)
      return response.data.data
    },
    enabled: !!examId,
    staleTime: 60 * 1000,
  })
}

// ============================================================
// Start Attempt
// ============================================================

export interface StartAttemptRequest {
  mode: ExamMode
}

export const useStartAttempt = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ examId, mode }: { examId: string; mode: ExamMode }) => {
      const response = await api.post<{ data: ExamAttempt }>(
        `/api/v1/attempts`,
        { exam_id: examId, mode }
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      queryClient.invalidateQueries({ queryKey: ['exam-history'] })
    },
    onError: () => {
      toast.error('Failed to start exam attempt')
    },
  })
}

// ============================================================
// Exam History
// ============================================================

export const useExamHistory = (limit?: number) => {
  return useQuery({
    queryKey: ['exam-history', limit],
    queryFn: async () => {
      const url = limit ? `/api/v1/me/exam-history?limit=${limit}` : '/api/v1/me/exam-history'
      const response = await api.get<{ data: ExamAttempt[] }>(url)
      return response.data.data
    },
    staleTime: 30 * 1000,
  })
}

// ============================================================
// Exam Play (presigned audio URL)
// ============================================================

export const useExamPlayUrl = (examId: string, skillAttemptId?: string) => {
  return useQuery({
    queryKey: ['exam-play', examId, skillAttemptId],
    queryFn: async () => {
      const url = skillAttemptId
        ? `/api/v1/exams/${examId}/play?skill_attempt_id=${skillAttemptId}`
        : `/api/v1/exams/${examId}/play`
      const response = await api.get<{ data: { url: string } }>(url)
      return response.data.data.url
    },
    enabled: !!examId,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================
// Exam Grading Detail
// ============================================================

export const useExamGrading = (examId: string) => {
  return useQuery({
    queryKey: ['exam-grading', examId],
    queryFn: async () => {
      const response = await api.get<{ data: Record<string, unknown> }>(`/api/v1/exams/${examId}/grading`)
      return response.data.data
    },
    enabled: !!examId,
    staleTime: 30 * 1000,
  })
}

/** Fetch grading JSON (privileged roles). */
export const useExamGradingFetchMutation = () => {
  return useMutation({
    mutationFn: async (examId: string) => {
      const response = await api.get<{ data: Record<string, unknown> }>(`/api/v1/exams/${examId}/grading`)
      return response.data.data
    },
  })
}

/** Fetch manifest.json (system_admin). */
export const useExamManifestFetchMutation = () => {
  return useMutation({
    mutationFn: async (examId: string) => {
      const response = await api.get<{ data: Record<string, unknown> }>(`/api/v1/exams/${examId}/manifest`)
      return response.data.data
    },
  })
}

/** Presign any object under the exam revision folder (listening audio, etc.). */
export const useExamArtifactPresignMutation = () => {
  return useMutation({
    mutationFn: async ({ examId, s3Key }: { examId: string; s3Key: string }) => {
      const response = await api.get<{ data: ExamPlayPresign }>(`/api/v1/exams/${examId}/artifact-presign`, {
        params: { s3_key: s3Key },
      })
      return response.data.data
    },
  })
}

// ============================================================
// Exam bank (registry) — requires system_admin; matches exam-service summaries
// ============================================================

export interface ExamBankListEnvelope {
  data: ExamRegistrySummary[]
  meta?: { next_cursor?: string }
  request_id?: string
}

/** List published exams from global registry (`GET /api/v1/exams`). */
export const useExamBankList = (
  filters: ExamFilters = {},
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['exam-bank', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.q) params.set('q', filters.q)
      if (filters.limit) params.set('limit', String(filters.limit))
      if (filters.cursor) params.set('cursor', filters.cursor)
      if (filters.status) params.set('status', filters.status)
      const query = params.toString()
      const response = await api.get<ExamBankListEnvelope>(
        `/api/v1/exams${query ? `?${query}` : ''}`,
      )
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  })
}

type ExamBankBaseFilters = Omit<ExamFilters, 'cursor'>

/** Cursor pagination that appends pages (Load more). */
export const useExamBankListInfinite = (
  base: ExamBankBaseFilters,
  options?: { enabled?: boolean },
) => {
  return useInfiniteQuery({
    queryKey: ['exam-bank-infinite', base],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (base.type) params.set('type', base.type)
      if (base.q) params.set('q', base.q)
      if (base.limit) params.set('limit', String(base.limit))
      if (base.status) params.set('status', base.status)
      if (pageParam) params.set('cursor', pageParam)
      const query = params.toString()
      const response = await api.get<ExamBankListEnvelope>(
        `/api/v1/exams${query ? `?${query}` : ''}`,
      )
      return response.data
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta?.next_cursor?.trim()
        ? lastPage.meta.next_cursor
        : undefined,
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  })
}

/** Single registry row (`GET /api/v1/exams/{exam_id}`). */
export const useExamBankDetail = (examId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['exam-bank', 'detail', examId],
    queryFn: async () => {
      const response = await api.get<{ data: ExamRegistrySummary }>(`/api/v1/exams/${examId}`)
      return response.data.data
    },
    enabled: !!examId && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  })
}

/** Presigned GET for play.json (`GET /api/v1/exams/{id}/play`) — system_admin only; may 503 without S3. */
export const useExamPlayPresignMutation = () => {
  return useMutation({
    mutationFn: async (examId: string) => {
      const response = await api.get<{ data: ExamPlayPresign }>(`/api/v1/exams/${examId}/play`)
      return response.data.data
    },
  })
}

// ============================================================
// Exam migration jobs (admin control-plane)
// ============================================================

interface ExamMigrationJobDetailEnvelope {
  job: ExamMigrationJob
  results?: unknown[]
  mutation?: unknown
}

export const useExamMigrationJobs = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['exam-migrations', 'jobs'],
    queryFn: async () => {
      const response = await api.get<{ data: ExamMigrationJob[] }>(
        '/api/v1/admin/exam-migrations/jobs',
      )
      return response.data.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  })
}

export const useExamMigrationJobDetail = (jobId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['exam-migrations', 'jobs', jobId],
    queryFn: async () => {
      const response = await api.get<{ data: ExamMigrationJobDetailEnvelope }>(
        `/api/v1/admin/exam-migrations/jobs/${jobId}`,
      )
      return response.data.data
    },
    enabled: !!jobId && (options?.enabled ?? true),
    staleTime: 10 * 1000,
  })
}

export const useExamMigrationJobResults = (jobId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['exam-migrations', 'jobs', jobId, 'results'],
    queryFn: async () => {
      const response = await api.get<{ data: ExamMigrationJobDetailEnvelope }>(
        `/api/v1/admin/exam-migrations/jobs/${jobId}/results`,
      )
      return response.data.data
    },
    enabled: !!jobId && (options?.enabled ?? true),
    staleTime: 10 * 1000,
  })
}
