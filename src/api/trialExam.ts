import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

// ============================================================
// Types
// ============================================================

export type TrialSkill = 'reading' | 'listening' | 'writing' | 'speaking'

export type SessionStatus = 'in_progress' | 'submitted' | 'expired'
export type GradingStatus = 'pending' | 'ai_done' | 'teacher_review' | 'approved'
export type QueueStatus = 'pending' | 'in_review' | 'approved'

export interface EligibilityInfo {
  eligible_skills: TrialSkill[]
  used_skills: TrialSkill[]
}

export interface TrialSession {
  id: string
  skill: TrialSkill
  status: SessionStatus
  exam_uuid: string
  started_at: string
  expires_at: string
  submitted_at?: string
}

export interface StartTrialRequest {
  skill: TrialSkill
}

export interface AutosaveRequest {
  answers: Record<string, unknown>
  client_seq: number
}

export interface TrialResult {
  id: string
  session_id: string
  skill: TrialSkill
  grading_status: GradingStatus
  visible_to_student: boolean
  band_score: number | null
  correct_count: number | null
  total_questions: number | null
  ai_band_score: number | null
  ai_criteria?: Record<string, number>
  ai_feedback: string | null
  teacher_band_score: number | null
  teacher_comments: string | null
  created_at?: string
}

export interface GradingQueueItem {
  id: string
  session_id: string
  skill: TrialSkill
  status: QueueStatus
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
// Raw Play JSON Types (aligned with backend's exam.play.v1 schema)
// ============================================================

export interface RawPlayArtifact {
  schema_version: string
  exam_uuid: string
  title: string
  type: string
  status: string
  source?: {
    legacy_table?: string
    legacy_updated_at?: string
    generated_at_utc?: string
  }
  parts: RawPlayPart[]
}

export interface RawPlayPart {
  question: string
  part_index: number
  listening_times?: RawListeningTime[]
  question_groups: RawPlayQuestionGroup[]
}

export interface RawListeningTime {
  label: string
  start: number
  end: number
}

export interface RawPlayQuestionGroup {
  title?: string
  question?: string
  group_index: number
  audio_file?: RawPlayAudioFile | null
}

export interface RawPlayAudioFile {
  s3_key?: string
  url?: string
  duration?: number
  media_type?: string
}

// ============================================================
// Exam Content Types (aligned with backend response)
// ============================================================

export interface QuestionOption {
  key: string   // e.g., "A", "B", "C", "D"
  text: string  // plain text option
  order?: number
}

export interface FlatQuestion {
  question_index: number
  question: string
  html_question?: string
  question_type: string
  part_index: number
  group_index: number
  options?: QuestionOption[]
}

export interface ListeningTime {
  label: string
  start: number
  end: number
}

export interface ExamPart {
  partIndex: number
  passage?: string
  question?: string
  questions?: FlatQuestion[]
  listening_times?: ListeningTime[]
}

export interface ExamContent {
  // New format (from /content endpoint with raw play)
  session_id?: string
  skill?: string
  status?: SessionStatus
  started_at?: string
  expires_at?: string
  remaining_seconds?: number
  answers?: Record<string, unknown>
  play?: RawPlayArtifact

  // Old format (direct, used by admin grading)
  exam_content?: ExamContentBody

  // Legacy format (direct exam content)
  exam_uuid?: string
  title?: string
  type?: string
  passage?: string
  questions?: FlatQuestion[]
  parts?: ExamPart[]
  media_url?: string
  media_duration?: number
}

export interface ExamContentBody {
  exam_uuid: string
  title: string
  type: string
  skill: string
  prompt?: string
  passage?: string
  questions?: FlatQuestion[]
  parts?: ExamPart[]
  media_url?: string
  media_duration?: number
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
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
    onError: (err: AxiosError<{ error?: string }>) => {
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
    enabled: !!sessionId && sessionId !== 'undefined' && sessionId !== 'null',
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      const session = query.state.data
      if (session?.status === 'in_progress') return 30 * 1000
      return false
    },
    retry: 1,
  })
}

// ============================================================
// Autosave
// ============================================================

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
    retry: 2,
    retryDelay: 1000,
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
    onError: (err: AxiosError<{ error?: string }>) => {
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
        timeout: 60_000, // 60s for large audio files
      })
      return response.data
    },
    onError: () => {
      toast.error('Failed to upload audio')
    },
    retry: 1,
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
    enabled: !!sessionId && sessionId !== 'undefined' && sessionId !== 'null',
    staleTime: 20 * 1000,
    refetchInterval: (query) => {
      const result = query.state.data
      if (result && !result.visible_to_student) return 15 * 1000
      return false
    },
    retry: 1,
  })
}

// ============================================================
// Get Exam Content (session + answers for crash recovery)
// ============================================================

export const useTrialExamContent = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ['trial-exam', 'content', sessionId],
    queryFn: async (): Promise<ExamContent> => {
      const response = await api.get<ExamContent>(`/api/v1/trial-exam/${sessionId}/content`)
      return response.data
    },
    enabled: !!sessionId && sessionId !== 'undefined' && sessionId !== 'null',
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

// ============================================================
// Teacher Grading Queue (Trial)
// ============================================================

export interface TrialGradingQueueDetail extends GradingQueueItem {
  session?: {
    user_id: string
    started_at: string
    exam_uuid: string
  }
  essay_text?: string
  audio_key?: string
  exam_content?: ExamContentBody
}

export interface TrialApproveRequest {
  band_score: number
  comments: string
}

export const useTrialGradingQueue = (filters?: { skill?: TrialSkill; status?: string }) => {
  return useQuery({
    queryKey: ['trial-grading', 'queue', filters],
    queryFn: async (): Promise<GradingQueueItem[]> => {
      const params = new URLSearchParams()
      if (filters?.skill) params.set('skill', filters.skill)
      if (filters?.status) params.set('status', filters.status)
      const query = params.toString()
      const response = await api.get<{ items: GradingQueueItem[] }>(
        `/api/v1/admin/trial-grading${query ? `?${query}` : ''}`
      )
      return response.data.items
    },
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
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
    enabled: !!queueId && queueId !== 'undefined' && queueId !== 'null',
    retry: 1,
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
    enabled: !!queueId && enabled && queueId !== 'undefined' && queueId !== 'null',
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

// ============================================================
// Get all sessions for current user
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
    retry: 1,
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
    retry: 1,
  })
}
