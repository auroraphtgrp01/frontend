import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useTrialSession,
  useSubmitTrial,
  useTrialResult,
  useUploadSpeakingAudio,
  useTrialExamContent,
  type ExamContent,
  type FlatQuestion,
} from '@/api/trialExam'
import {
  useTrialExamAutosave,
  saveTrialSessionToStorage,
  loadTrialSessionFromStorage,
  clearTrialSessionFromStorage,
} from '@/hooks/useTrialExamAutosave'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ReadingViewer } from '@/components/exam/ReadingViewer'
import { WritingEditor } from '@/components/exam/WritingEditor'
import { SpeakingRecorder } from '@/components/exam/SpeakingRecorder'
import { ListeningPlayer } from '@/components/exam/ListeningPlayer'
import { SubmitConfirmDialog } from '@/components/exam/SubmitConfirmDialog'
import { Loader2, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { splitPassagesByPart } from '@/utils/parseExamHTML'

// ============================================================
// Helpers
// ============================================================

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function mapQuestionType(t: string): import('@/types/exam').QuestionType {
  switch (t) {
    case 'multiple_choice':
    case 'single-choice':
    case 'single_choice':
      return 'multiple_choice'
    case 'true_false':
    case 'truefalse':
      return 'true_false'
    case 'fill_blank':
    case 'fillblank':
    case 'fill-blank':
      return 'fill_blank'
    case 'matching':
      return 'matching'
    case 'short_answer':
    case 'shortanswer':
      return 'short_answer'
    case 'diagram':
      return 'diagram'
    case 'essay':
      return 'essay'
    case 'speaking':
      return 'speaking'
    default:
      return 'multiple_choice'
  }
}

// ============================================================
// Reading / Listening Question Panel
// ============================================================

interface LRExamPanelProps {
  content: ExamContent
  answers: Record<string, unknown>
  onChange: (answers: Record<string, unknown>) => void
  disabled: boolean
}

interface ReadingPart {
  partIndex: number
  passage: string
  questions: FlatQuestion[]
}

function LRExamPanel({ content, answers, onChange, disabled }: LRExamPanelProps) {
  // Use parts structure from backend (already parsed)
  const parts: ReadingPart[] = useMemo(() => {
    // If content has parts structure, use it directly (backend already parsed HTML)
    if (content.parts && content.parts.length > 0) {
      return content.parts.map((part) => ({
        partIndex: part.partIndex,
        passage: part.passage || part.question || '',
        questions: part.questions || [],
      }))
    }

    // Fallback: use flat questions
    return [{
      partIndex: 1,
      passage: content.passage || '',
      questions: content.questions || [],
    }]
  }, [content])

  return (
    <div className="space-y-6">
      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{content.title || 'Trial Exam'}</CardTitle>
        </CardHeader>
      </Card>

      {/* Listening audio */}
      {content.type === 'listening' && content.media_url && (
        <ListeningPlayer src={content.media_url} className="sticky top-0 z-10 bg-white shadow-md" />
      )}

      {/* Render each part */}
      {parts.map((part) => (
        <div key={`part-${part.partIndex}`} className="space-y-4">
          {/* Reading passage for this part */}
          {content.type === 'reading' && part.passage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                    Part {part.partIndex}
                  </span>
                  Reading Passage {part.partIndex}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReadingViewer passage={part.passage} className="max-h-[500px] overflow-y-auto" />
              </CardContent>
            </Card>
          )}

          {/* Questions section - render as embedded HTML */}
          {part.questions.length > 0 && (
            <div className="space-y-1">
              <ExamQuestionsSection
                questions={part.questions}
                answers={answers}
                onChange={onChange}
              />
            </div>
          )}
        </div>
      ))}

      {/* Fallback if no parts */}
      {parts.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No questions found for this exam. The exam content may not be available yet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ============================================================
// Exam Questions Section - Renders HTML with embedded inputs
// ============================================================

interface ExamQuestionsSectionProps {
  questions: FlatQuestion[]
  answers: Record<string, string | string[] | null>
  onChange: (answers: Record<string, string | string[] | null>) => void
}

function ExamQuestionsSection({ questions, answers, onChange }: ExamQuestionsSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync initial answers to DOM inputs
  useEffect(() => {
    if (!containerRef.current) return

    Object.entries(answers).forEach(([key, value]) => {
      if (value === null || value === undefined) return

      // Handle text inputs
      const textInput = containerRef.current?.querySelector(`[name="${key}"][type="text"]`) as HTMLInputElement | null
      if (textInput && typeof value === 'string') {
        textInput.value = value
        return
      }

      // Handle radio inputs
      const radioInputs = containerRef.current?.querySelectorAll(`[name="${key}"][type="radio"]`) as NodeListOf<HTMLInputElement>
      if (radioInputs) {
        radioInputs.forEach(radio => {
          radio.checked = radio.value === value
        })
        return
      }

      // Handle checkbox inputs
      const checkboxInputs = containerRef.current?.querySelectorAll(`[name="${key}"][type="checkbox"]`) as NodeListOf<HTMLInputElement>
      if (checkboxInputs && Array.isArray(value)) {
        checkboxInputs.forEach(cb => {
          cb.checked = value.includes(cb.value)
        })
        return
      }

      // Handle select inputs
      const selectInput = containerRef.current?.querySelector(`[name="${key}"]`) as HTMLSelectElement | null
      if (selectInput && typeof value === 'string') {
        selectInput.value = value
      }
    })
  }, [answers])

  // Listen to input changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement
      const name = target.name
      if (!name) return

      if (target.type === 'radio') {
        const radio = target as HTMLInputElement
        if (radio.checked) {
          onChange({ ...answers, [name]: radio.value })
        }
      } else if (target.type === 'checkbox') {
        const checkbox = target as HTMLInputElement
        const currentValues = (answers[name] as string[]) || []
        let newValues: string[]
        if (checkbox.checked) {
          newValues = [...currentValues, checkbox.value]
        } else {
          newValues = currentValues.filter(v => v !== checkbox.value)
        }
        onChange({ ...answers, [name]: newValues })
      } else if (target.tagName === 'SELECT') {
        const select = target as HTMLSelectElement
        onChange({ ...answers, [name]: select.value })
      } else if (target.type === 'text') {
        const text = target as HTMLInputElement
        onChange({ ...answers, [name]: text.value })
      }
    }

    container.addEventListener('change', handleChange)
    container.addEventListener('input', handleChange as EventListener)
    return () => {
      container.removeEventListener('change', handleChange)
      container.removeEventListener('input', handleChange as EventListener)
    }
  }, [answers, onChange])

  const htmlContent = questions
    .map(q => q.html_question)
    .filter(Boolean)
    .join('\n')

  return (
    <div
      ref={containerRef}
      className="exam-questions-html space-y-3"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

// ============================================================
// Writing Panel
// ============================================================

interface WritingPanelProps {
  content: ExamContent
  essayText: string
  onEssayChange: (text: string) => void
  disabled: boolean
}

function WritingPanel({ content, essayText, onEssayChange, disabled }: WritingPanelProps) {
  const REQUIRED_MIN_WORDS = 150

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{content.title || 'Writing Task'}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Prompt */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-900 mb-1">Task</p>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">
              {content.prompt || 'No prompt available.'}
            </p>
          </div>

          {/* Editor */}
          <WritingEditor
            value={essayText}
            onChange={onEssayChange}
            disabled={disabled}
            placeholder="Type your essay here..."
            minWords={REQUIRED_MIN_WORDS}
            maxWords={500}
          />

          {/* Tips */}
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-800">
              <strong>Tips:</strong> Write at least {REQUIRED_MIN_WORDS} words.
              Focus on task achievement, coherence, lexical resource, and grammatical range.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Speaking Panel
// ============================================================

interface SpeakingPanelProps {
  content: ExamContent
  audioBlob: { blob: Blob; duration: number } | null
  onRecordingComplete: (blob: Blob, duration: number) => void
  disabled: boolean
}

function SpeakingPanel({ content, audioBlob, onRecordingComplete, disabled }: SpeakingPanelProps) {
  const audioUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob.blob) : null),
    [audioBlob]
  )

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{content.title || 'Speaking Task'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio prompt */}
          {content.media_url && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Audio Prompt</p>
              <audio src={content.media_url} controls className="w-full h-10" />
            </div>
          )}

          {/* Prompt */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-900 mb-1">Task</p>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">
              {content.prompt || 'No prompt available.'}
            </p>
          </div>

          {/* Recorded audio playback */}
          {audioBlob && audioUrl && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Recording saved</p>
                <audio src={audioUrl} controls className="w-full h-8 mt-1" />
              </div>
            </div>
          )}

          {/* Recorder */}
          {!disabled && (
            <SpeakingRecorder
              onRecordingComplete={onRecordingComplete}
              maxDuration={120}
              maxRetries={3}
            />
          )}

          {disabled && !audioBlob && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Session has ended. No recording was made.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function TrialExamSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  // Guard against invalid sessionId (e.g. "undefined" string from stale navigation)
  const safeSessionId = sessionId && sessionId !== 'undefined' && sessionId !== 'null' ? sessionId : ''

  const { data: session, isLoading: sessionLoading } = useTrialSession(safeSessionId)
  const { data: result } = useTrialResult(safeSessionId)
  const submitMutation = useSubmitTrial()
  const uploadMutation = useUploadSpeakingAudio()
  const { data: content, isLoading: contentLoading, error: contentError } = useTrialExamContent(safeSessionId || undefined)

  // ---- State ----
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [essayText, setEssayText] = useState('')
  const [audioBlob, setAudioBlob] = useState<{ blob: Blob; duration: number } | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  // ---- Immutable refs for submit guard (NEVER causes re-renders) ----
  const submittingRef = useRef(false)
  const sessionIdRef = useRef(safeSessionId)
  sessionIdRef.current = safeSessionId
  const audioBlobRef = useRef(audioBlob)
  audioBlobRef.current = audioBlob

  // ---- Restore answers from localStorage on mount ----
  useEffect(() => {
    if (!safeSessionId) return
    const saved = loadTrialSessionFromStorage(safeSessionId)
    if (saved) {
      setAnswers(saved.answers)
      setEssayText(saved.essayText)
      toast.info('Your previous progress has been restored.')
    }
  }, [safeSessionId])

  // ---- Persist answers to localStorage on change (crash recovery) ----
  useEffect(() => {
    if (!safeSessionId || !session || session.status !== 'in_progress') return
    saveTrialSessionToStorage(safeSessionId, { answers, essayText })
  }, [answers, essayText, safeSessionId, session?.status])

  // Guard: redirect if sessionId is invalid (e.g. stale "undefined" string)
  useEffect(() => {
    if (sessionId && (sessionId === 'undefined' || sessionId === 'null' || sessionId === '')) {
      navigate('/app/trial')
    }
  }, [sessionId, navigate])

  // ---- Autosave hook (debounce 2s + checkpoint 30s + client_seq) ----
  // Must be called before callbacks that depend on it
  const { isSaving, saveNow: autosaveSaveNow } = useTrialExamAutosave({
    sessionId: safeSessionId,
    answers,
    essayText,
    enabled: session?.status === 'in_progress' && !!(content && !contentLoading),
  })

  // ---- Callbacks ----
  const handleAnswerChange = useCallback((newAnswers: Record<string, unknown>) => {
    setAnswers(newAnswers)
  }, [])

  const handleEssayChange = useCallback((text: string) => {
    setEssayText(text)
    setAnswers((prev) => ({ ...prev, essay_text: text }))
  }, [])

  const handleRecordingComplete = useCallback((blob: Blob, _duration: number) => {
    setAudioBlob({ blob, duration: _duration })
    toast.success('Recording saved. Submit to upload.')
  }, [])

  const handleSubmitClick = useCallback(() => {
    setShowSubmitDialog(true)
  }, [])

  // ---- CORE SUBMIT: chỉ gọi được 1 lần duy nhất ----
  const doSubmit = useCallback(async () => {
    // IMMUTABLE guard: không thể submit 2 lần dù có click bao nhiêu
    if (submittingRef.current) return
    submittingRef.current = true

    const currentSessionId = sessionIdRef.current
    const currentAudio = audioBlobRef.current

    setShowSubmitDialog(false)

    try {
      // Upload speaking audio first
      if (currentAudio) {
        const file = new File([currentAudio.blob], 'recording.webm', { type: 'audio/webm' })
        await uploadMutation.mutateAsync({ sessionId: currentSessionId, file })
      }

      // Force save final answers
      await autosaveSaveNow()

      // Submit
      await submitMutation.mutateAsync(currentSessionId)

      // Clear localStorage
      clearTrialSessionFromStorage(currentSessionId)

      // Navigate after success
      navigate('/app/trial')
    } catch {
      // Unguard on error để user có thể thử lại
      submittingRef.current = false
    }
  }, [uploadMutation, autosaveSaveNow, submitMutation, navigate])

  // ---- Countdown timer ----
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return

    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
      )
      setTimeLeft(left)

      // Chỉ trigger submit KHI thực sự hết giờ VÀ chưa submit
      if (left === 0 && !submittingRef.current) {
        toast.error('Time is up! Submitting your answers...')
        doSubmit()
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.expires_at, session?.status, doSubmit])

  // ---- Expiry warnings ----
  useEffect(() => {
    if (timeLeft === null || !session || session.status !== 'in_progress') return

    if (timeLeft === 5 * 60) {
      toast.warning('5 minutes remaining! Please finish your answers.')
    } else if (timeLeft === 60) {
      toast.error('1 minute remaining! Submit now!')
    }
  }, [timeLeft, session?.status])

  // ---- Loading state ----
  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  // ---- Not found ----
  if (!session) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Session not found.</AlertDescription>
      </Alert>
    )
  }

  // ---- Submitted / expired → show result or waiting message ----
  if (session.status !== 'in_progress') {
    if (!result) {
      return (
        <div className="mx-auto max-w-2xl p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Submitted. Waiting for grading results...</p>
        </div>
      )
    }

    if (!result.visible_to_student) {
      return (
        <div className="mx-auto max-w-2xl p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Your result is not yet available. A teacher is reviewing your {session.skill} exam.
          </p>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold capitalize">{session.skill} Result</h1>
            <p className="text-muted-foreground">
              Submitted on {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.band_score !== null && (
              <div className="text-5xl font-bold text-center">{result.band_score.toFixed(1)}</div>
            )}
            {result.correct_count !== null && result.total_questions !== null && (
              <p className="text-center text-muted-foreground">
                {result.correct_count} / {result.total_questions} correct
              </p>
            )}
            {result.teacher_comments && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Teacher Feedback:</p>
                <p className="mt-1">{result.teacher_comments}</p>
              </div>
            )}
            {result.ai_feedback && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                <p className="font-medium">AI Feedback:</p>
                <p className="mt-1">{result.ai_feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={() => navigate('/app/trial')} className="w-full">
          Back to Trial Exam
        </Button>
      </div>
    )
  }

  // ---- Content loading error ----
  if (contentError) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{String(contentError)}</AlertDescription>
      </Alert>
    )
  }

  // ---- In-progress session ----
  const isSubmitting = submitMutation.isPending || uploadMutation.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize">{session.skill} Trial Exam</h1>
          <p className="text-sm text-muted-foreground">
            {content?.title ?? `Exam UUID: ${session.exam_uuid}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {timeLeft !== null && (
            <div
              className={`rounded-lg px-4 py-2 text-xl font-mono font-bold ${
                timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-muted'
              }`}
            >
              <Clock className="inline mr-1 h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Loading content */}
      {contentLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      )}

      {/* Reading / Listening */}
      {content && !contentLoading && (session.skill === 'reading' || session.skill === 'listening') && (
        <LRExamPanel
          content={content}
          answers={answers}
          onChange={handleAnswerChange}
          disabled={false}
        />
      )}

      {/* Writing */}
      {content && !contentLoading && session.skill === 'writing' && (
        <WritingPanel
          content={content}
          essayText={essayText}
          onEssayChange={handleEssayChange}
          disabled={false}
        />
      )}

      {/* Speaking */}
      {content && !contentLoading && session.skill === 'speaking' && (
        <SpeakingPanel
          content={content}
          audioBlob={audioBlob}
          onRecordingComplete={handleRecordingComplete}
          disabled={false}
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => navigate('/app/trial')}>
          Exit
        </Button>
        <Button onClick={handleSubmitClick} disabled={isSubmitting || submittingRef.current} className="gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" />
          Submit
        </Button>
      </div>

      {/* Submit confirmation dialog */}
      <SubmitConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        unansweredCount={content?.questions ? content.questions.length - Object.keys(answers).filter(k => k.startsWith('q-') && answers[k] !== null && answers[k] !== '').length : 0}
        onConfirm={doSubmit}
        skillName={session?.skill}
      />
    </div>
  )
}
