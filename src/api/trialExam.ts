import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

export type TrialSkill = 'reading' | 'listening' | 'writing' | 'speaking'

export interface EligibilityInfo {
  eligible_skills: TrialSkill[]
  used_skills: TrialSkill[]
}

export interface TrialSession {
  id: string
  skill: TrialSkill
  status: 'in_progress' | 'submitted' | 'expired'
  exam_uuid: string
  started_at: string
  expires_at: string
}

export interface StartTrialRequest {
  skill: TrialSkill
}

export interface AutosaveRequest {
  answers: Record<string, unknown>
}

export interface TrialResult {
  id: string
  session_id: string
  skill: TrialSkill
  grading_status: 'pending' | 'ai_done' | 'teacher_review' | 'approved'
  visible_to_student: boolean
  band_score: number | null
  correct_count: number | null
  total_questions: number | null
  ai_band_score: number | null
  ai_feedback: string | null
  teacher_band_score: number | null
  teacher_comments: string | null
}

export interface GradingQueueItem {
  id: string
  session_id: string
  skill: TrialSkill
  status: 'pending' | 'in_review' | 'approved'
  assigned_teacher_id: string | null
  picked_at: string | null
  approved_at: string | null
  created_at: string
}

export interface ApproveRequest {
  band_score: number
  comments: string
}

// ============================================================
// Eligibility
// ============================================================

export const useTrialEligibility = () => {
  return useQuery({
    queryKey: ['trial-exam', 'eligibility'],
    queryFn: async (): Promise<EligibilityInfo> => {
      const response = await api.get<EligibilityInfo>('/api/v1/trial-exam/eligibility')
      return response.data
    },
    staleTime: 30 * 1000,
  })
}

// ============================================================
// Start Trial
// ============================================================

export const useStartTrial = () => {
  return useMutation({
    mutationFn: async (data: StartTrialRequest): Promise<TrialSession> => {
      const response = await api.post<TrialSession>('/api/v1/trial-exam/start', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Trial exam session started!')
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err?.response?.data?.error ?? 'Failed to start trial exam')
    },
  })
}

// ============================================================
// Get Session
// ============================================================

export const useTrialSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['trial-exam', 'session', sessionId],
    queryFn: async (): Promise<TrialSession> => {
      const response = await api.get<TrialSession>(`/api/v1/trial-exam/${sessionId}`)
      return response.data
    },
    enabled: !!sessionId,
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      const session = query.state.data
      if (session?.status === 'in_progress') return 30 * 1000
      return false
    },
  })
}

// ============================================================
// Autosave
// ============================================================

export interface AutosaveRequest {
  answers: Record<string, unknown>
  client_seq?: number
}

export const useTrialAutosave = () => {
  return useMutation({
    mutationFn: async ({
      sessionId,
      answers,
      clientSeq,
    }: {
      sessionId: string
      answers: Record<string, unknown>
      clientSeq?: number
    }) => {
      await api.patch(`/api/v1/trial-exam/${sessionId}/autosave`, {
        answers,
        client_seq: clientSeq ?? 0,
      } satisfies AutosaveRequest)
      return clientSeq ?? 0
    },
  })
}

// ============================================================
// Submit
// ============================================================

export const useSubmitTrial = () => {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.post<{ status: string; submitted_at: string }>(
        `/api/v1/trial-exam/${sessionId}/submit`
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Submitted! Your result will be available once graded.')
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err?.response?.data?.error ?? 'Failed to submit')
    },
  })
}

// ============================================================
// Speaking Audio Upload
// ============================================================

export const useUploadSpeakingAudio = () => {
  return useMutation({
    mutationFn: async ({
      sessionId,
      file,
    }: {
      sessionId: string
      file: File
    }) => {
      const formData = new FormData()
      formData.append('audio', file)
      const response = await api.post(`/api/v1/trial-exam/${sessionId}/speaking/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onError: () => {
      toast.error('Failed to upload audio')
    },
  })
}

// ============================================================
// Get Results
// ============================================================

export const useTrialResult = (sessionId: string) => {
  return useQuery({
    queryKey: ['trial-exam', 'result', sessionId],
    queryFn: async (): Promise<TrialResult> => {
      const response = await api.get<TrialResult>(`/api/v1/trial-exam/${sessionId}/results`)
      return response.data
    },
    enabled: !!sessionId,
    staleTime: 20 * 1000,
    refetchInterval: (query) => {
      const result = query.state.data
      // Poll while result is not yet visible
      if (result && !result.visible_to_student) return 15 * 1000
      return false
    },
  })
}

export interface ExamContent {
  exam_uuid: string
  title: string
  type: string
  skill: string
  prompt?: string
  passage?: string  // full reading passage text (for legacy/existing exams)
  questions?: FlatQuestion[]  // flat list of questions
  parts?: ExamPart[]  // structured parts for multi-passage exams
  media_url?: string
  media_duration?: number
}

export interface ExamPart {
  partIndex: number
  passage?: string  // reading passage text for this part
  question?: string  // or prompt text (for writing/speaking)
  questions?: FlatQuestion[]  // questions for this part
  listening_times?: ListeningTime[]
}

export interface ListeningTime {
  label: string
  start: number
  end: number
}

export interface QuestionOption {
  key: string  // e.g., "A", "B", "C", "D"
  text: string // plain text option
  order?: number // original order in the legacy data
}

export interface FlatQuestion {
  question_index: number
  question: string
  html_question?: string  // HTML version of the question text
  question_type: string
  part_index: number
  group_index: number
  options?: QuestionOption[]  // answer choices for multiple-choice questions
}

// ============================================================
// Get Exam Content
// ============================================================

export const useTrialExamContent = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ['trial-exam', 'content', sessionId],
    queryFn: async (): Promise<ExamContent> => {
      const response = await api.get<ExamContent>(`/api/v1/trial-exam/${sessionId}/content`)
      return response.data
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // content doesn't change
    retry: 1,
  })
}

// ============================================================
// Teacher Grading Queue (Trial)
// ============================================================

export interface TrialGradingQueueItem {
  id: string
  session_id: string
  skill: TrialSkill
  status: 'pending' | 'in_review' | 'approved'
  assigned_teacher_id: string | null
  picked_at: string | null
  approved_at: string | null
  created_at: string
}

export interface TrialGradingQueueDetail extends TrialGradingQueueItem {
  session?: {
    user_id: string
    started_at: string
    exam_uuid: string
  }
  essay_text?: string
  audio_key?: string
  exam_content?: ExamContent
}

export interface TrialApproveRequest {
  band_score: number
  comments: string
}

export const useTrialGradingQueue = (filters?: { skill?: TrialSkill; status?: string }) => {
  return useQuery({
    queryKey: ['trial-grading', 'queue', filters],
    queryFn: async (): Promise<TrialGradingQueueItem[]> => {
      const params = new URLSearchParams()
      if (filters?.skill) params.set('skill', filters.skill)
      if (filters?.status) params.set('status', filters.status)
      const query = params.toString()
      const response = await api.get<{ items: TrialGradingQueueItem[] }>(
        `/api/v1/admin/trial-grading${query ? `?${query}` : ''}`
      )
      return response.data.items
    },
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export const useTrialQueueItem = (queueId: string) => {
  return useQuery({
    queryKey: ['trial-grading', 'item', queueId],
    queryFn: async (): Promise<TrialGradingQueueDetail> => {
      const response = await api.get<TrialGradingQueueDetail>(
        `/api/v1/admin/trial-grading/${queueId}`
      )
      return response.data
    },
    enabled: !!queueId,
  })
}

export const useTrialPick = () => {
  return useMutation({
    mutationFn: async (queueId: string) => {
      await api.post(`/api/v1/admin/trial-grading/${queueId}/pick`)
    },
    onSuccess: () => {
      toast.success('Grading item picked. You can now review and approve.')
    },
    onError: () => {
      toast.error('Failed to pick grading item')
    },
  })
}

export const useTrialApprove = () => {
  return useMutation({
    mutationFn: async ({ queueId, data }: { queueId: string; data: TrialApproveRequest }) => {
      await api.post(`/api/v1/admin/trial-grading/${queueId}/approve`, data)
    },
    onSuccess: () => {
      toast.success('Grading approved and student notified.')
    },
    onError: () => {
      toast.error('Failed to approve grading')
    },
  })
}

// ============================================================
// Audio URL (Speaking)
// ============================================================

export const useTrialAudioURL = (queueId: string | undefined, enabled: boolean) => {
  return useQuery({
    queryKey: ['trial-grading', 'audio-url', queueId],
    queryFn: async (): Promise<string> => {
      const response = await api.get<{ url: string }>(`/api/v1/admin/trial-grading/${queueId}/audio-url`)
      return response.data.url
    },
    enabled: !!queueId && enabled,
    staleTime: 10 * 60 * 1000, // audio URL is valid for 15min on server
    retry: 1,
  })
}

// ============================================================
// Get all sessions for current user (used on trial home page)
// ============================================================

export const useTrialSessions = () => {
  return useQuery({
    queryKey: ['trial-exam', 'sessions'],
    queryFn: async (): Promise<TrialSession[]> => {
      const response = await api.get<{ items: TrialSession[] }>('/api/v1/trial-exam/sessions')
      return response.data.items
    },
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  })
}

// ============================================================
// Get all past results for current user
// ============================================================

export interface TrialResultWithSession extends TrialResult {
  created_at: string
}

export const useTrialResults = () => {
  return useQuery({
    queryKey: ['trial-exam', 'results-list'],
    queryFn: async (): Promise<TrialResultWithSession[]> => {
      const response = await api.get<{ items: TrialResultWithSession[] }>('/api/v1/trial-exam/results')
      return response.data.items
    },
    staleTime: 20 * 1000,
  })
}
