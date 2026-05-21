// ============================================================
// Exam Types
// ============================================================

// ---------- Exam ----------

/**
 * Exam registry row from exam-service `GET /api/v1/exams` (artifact pointers).
 * Distinct from marketplace-style {@link Exam} used by learner UI mocks.
 */
export interface ExamRegistrySummary {
  exam_id: string
  exam_uuid?: string
  exam_type: string
  updated_at: string
  play_s3_key: string
  grading_s3_key?: string
  manifest_s3_key?: string
  status?: string
}

export interface ExamPlayPresign {
  url: string
  expires_at: string
  key: string
}

export type ExamMigrationJobStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'

export type ExamMigrationMode = 'dry-run' | 'apply' | 'verify' | 'repair-current'

export interface ExamMigrationSelection {
  exam_id?: number
  type?: SkillType
}

export interface ExamMigrationJob {
  job_id: string
  mode: ExamMigrationMode | string
  status: ExamMigrationJobStatus | string
  selection: ExamMigrationSelection
  created_at: string
  started_at?: string
  finished_at?: string
  result_count: number
}

export interface Exam {
  id: string
  title: string
  description?: string
  type: string
  mode: ExamMode
  duration: number // minutes
  price: number
  thumbnail?: string
  version: string
  published_at: string
  status?: string
  skill_count?: number
}

export type ExamMode = 'trial' | 'skill_practice' | 'full_test' | 'combo_lrw' | 'combo_speaking' | 'combo_lrws'

export interface ExamDetail extends Exam {
  skills: ExamSkill[]
  instructions?: string
  rules?: string
}

export interface ExamSkill {
  skill_type: SkillType
  duration: number
  question_count: number
}

export type SkillType = 'listening' | 'reading' | 'writing' | 'speaking'

// ---------- Exam Attempt ----------

export interface ExamAttempt {
  id: string
  runtime?: 'exam' | 'practice'
  exam_id: string
  exam_title?: string
  user_id: string
  status: AttemptStatus
  mode: ExamMode
  started_at: string
  expires_at?: string
  completed_at?: string
  skills?: SkillAttempt[]
  overall_band?: number
  // Fields from exam-attempt-service API (skill_practice mode)
  skill?: SkillType
  skill_attempt_id?: string
  exam_uuid?: string
  exam_play_url?: string
  exam_play_expires_at?: string
  audio_url?: string
  latest_server_seq?: number
  answers?: Record<string, { client_answer_seq: number; answer: unknown }>
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'completed'

export interface SkillAttempt {
  id: string
  skill_type: SkillType
  status: SkillStatus
  started_at?: string
  expires_at?: string
  submitted_at?: string
  score?: number
  band?: number
  exam_play_url?: string
  exam_play_expires_at?: string
  audio_url?: string
}

export type SkillStatus = 'not_started' | 'in_progress' | 'submitted' | 'scored' | 'manual_scored' | 'graded' | 'expired'

// ---------- Exam Results ----------

export interface ExamResult {
  id: string
  attempt_id: string
  skill?: string
  status?: string
  grading_status?: string
  grading_state?: string
  overall_band?: number | null
  listening_band?: number | null
  reading_band?: number | null
  writing_band?: number | null
  speaking_band?: number | null
  raw_score?: number
  visible: boolean
  created_at: string
  skill_results?: SkillResult[]
}

export type QuestionResultStatus = 'correct' | 'incorrect' | 'unanswered'

export interface QuestionResult {
  question_id: string
  status: QuestionResultStatus
  your_answer?: string
  correct_answers?: string[]
}

export interface SkillResult {
  skill_type: SkillType
  band?: number | null
  score: number
  max_score: number
  questions?: QuestionResult[]
  ai_feedback?: string
  teacher_feedback?: string
  examiner_comments?: string
}

// ---------- Questions ----------

export interface Question {
  id: string
  type: QuestionType
  text: string
  html?: string
  audio_url?: string
  passage?: string
  image_url?: string
  options?: QuestionOption[]
  correct_answer?: string | string[]
  max_words?: number
  part_index?: number
}

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'yes_no'
  | 'fill_blank'
  | 'matching'
  | 'drag_drop'
  | 'select'
  | 'paragraph_matching'
  | 'diagram'
  | 'short_answer'
  | 'essay'
  | 'speaking'

export interface QuestionOption {
  id: string
  text: string
  letter?: string
  correct?: boolean // only available in grading/review context, stripped during exam
}

// ---------- Grading ----------

export interface GradingQueueItem {
  id: string
  attempt_id: string
  skill_type: SkillType
  student_name: string
  exam_title: string
  submitted_at: string
  priority?: number
  assigned_to?: string
  status: GradingStatus
}

export type GradingStatus = 'pending' | 'in_review' | 'approved' | 'rejected'

export interface GradingReview {
  queue_item: GradingQueueItem
  attempt: ExamAttempt
  skill_attempt: SkillAttempt
  student_answer: StudentAnswer
  previous_feedback?: string
  examiner_comments?: string
}

export interface StudentAnswer {
  text?: string
  audio_url?: string
  word_count?: number
  recording_parts?: RecordingPart[]
}

export interface RecordingPart {
  part: number
  audio_url: string
  duration_seconds: number
  recorded_at: string
}

export interface GradingSubmission {
  queue_item_id: string
  band_score: number
  task_response?: number
  coherence?: number
  lexical?: number
  grammar?: number
  fluency?: number
  pronunciation?: number
  feedback: string
  comments?: string
  approved: boolean
}

// ---------- Auto-Save ----------

export interface CheckpointAnswer {
  question_id: string
  client_answer_seq?: number
  answer: string | string[] | null
  updated_at: string
}

export interface Checkpoint {
  attempt_id: string
  skill_attempt_id: string
  answers: CheckpointAnswer[]
  saved_at: string
  version: number
}
