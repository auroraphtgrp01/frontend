import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useTrialSession,
  useTrialAutosave,
  useSubmitTrial,
  useTrialResult,
  useUploadSpeakingAudio,
  useTrialExamContent,
  type ExamContent,
} from '@/api/trialExam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QuestionRenderer } from '@/components/exam/QuestionRenderer'
import { ReadingViewer } from '@/components/exam/ReadingViewer'
import { WritingEditor } from '@/components/exam/WritingEditor'
import { SpeakingRecorder } from '@/components/exam/SpeakingRecorder'
import { ListeningPlayer } from '@/components/exam/ListeningPlayer'
import { Loader2, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react'
import { toast } from 'sonner'

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

function LRExamPanel({ content, answers, onChange, disabled }: LRExamPanelProps) {
  const questions = content.questions ?? []
  const passage = content.passage ?? ''

  const handleAnswer = useCallback(
    (qIndex: number, value: string | string[] | null) => {
      onChange({ ...answers, [`q-${qIndex}`]: value })
    },
    [answers, onChange]
  )

  return (
    <div className="space-y-6">
      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{content.title || 'Trial Exam'}</CardTitle>
        </CardHeader>
      </Card>

      {/* Reading passage */}
      {content.type === 'reading' && passage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Passage</CardTitle>
          </CardHeader>
          <CardContent>
            <ReadingViewer passage={passage} className="max-h-96 overflow-y-auto" />
          </CardContent>
        </Card>
      )}

      {/* Listening audio */}
      {content.type === 'listening' && content.media_url && (
        <ListeningPlayer src={content.media_url} className="sticky top-0 z-10 bg-white shadow-md" />
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionRenderer
            key={`q-${q.question_index}`}
            question={{
              id: String(q.question_index),
              type: mapQuestionType(q.question_type),
              text: q.question,
              options: undefined,
            }}
            questionNumber={i + 1}
            answer={(answers[`q-${q.question_index}`] as string | null) ?? null}
            onChange={(val) => handleAnswer(q.question_index, val)}
            disabled={disabled}
          />
        ))}
      </div>

      {questions.length === 0 && (
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
  const autosaveMutation = useTrialAutosave()
  const submitMutation = useSubmitTrial()
  const uploadMutation = useUploadSpeakingAudio()
  const { data: content, isLoading: contentLoading, error: contentError } = useTrialExamContent(safeSessionId || undefined)

  // ---- All state must be declared before any callbacks that reference them ----
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [essayText, setEssayText] = useState('')
  const [audioBlob, setAudioBlob] = useState<{ blob: Blob; duration: number } | null>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answeredRef = useRef(false)

  // Stable refs to avoid stale closure in timer/interval callbacks
  const sessionRef = useRef(session)
  sessionRef.current = session
  const answersRef = useRef(answers)
  answersRef.current = answers
  const essayTextRef = useRef(essayText)
  essayTextRef.current = essayText
  const audioBlobRef = useRef(audioBlob)
  audioBlobRef.current = audioBlob

  // Guard: redirect if sessionId is invalid (e.g. stale "undefined" string)
  useEffect(() => {
    if (sessionId && (sessionId === 'undefined' || sessionId === 'null' || sessionId === '')) {
      navigate('/app/trial')
    }
  }, [sessionId, navigate])

  // ---- Handlers ----
  const handleAnswerChange = useCallback((newAnswers: Record<string, unknown>) => {
    answeredRef.current = true
    setAnswers(newAnswers)
  }, [])

  const handleEssayChange = useCallback((text: string) => {
    answeredRef.current = true
    setEssayText(text)
    setAnswers((prev) => ({ ...prev, essay_text: text }))
  }, [])

  const handleRecordingComplete = useCallback((blob: Blob, _duration: number) => {
    setAudioBlob({ blob, duration: _duration })
    toast.success('Recording saved. Submit to upload.')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!safeSessionId || !sessionRef.current) return
    try {
      const currentAudio = audioBlobRef.current
      if (sessionRef.current.skill === 'speaking' && currentAudio) {
        const file = new File([currentAudio.blob], 'recording.webm', { type: 'audio/webm' })
        await uploadMutation.mutateAsync({ sessionId: safeSessionId, file })
      }
      const finalAnswers = {
        ...answersRef.current,
        ...(sessionRef.current.skill === 'writing' ? { essay_text: essayTextRef.current } : {}),
      }
      await autosaveMutation.mutateAsync({ sessionId: safeSessionId, answers: finalAnswers })
      await submitMutation.mutateAsync(safeSessionId)
      navigate('/app/trial')
    } catch {
      // Error handled by mutations
    }
  }, [safeSessionId, uploadMutation, autosaveMutation, submitMutation, navigate])

  // ---- Countdown timer ----
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return
    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000)
      )
      setTimeLeft(left)
      if (left === 0) {
        toast.error('Time is up! Submitting your answers...')
        handleSubmit()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.expires_at, session?.status, handleSubmit])

  // ---- Auto-save every 30s ----
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return
    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current)

    autosaveTimerRef.current = setInterval(() => {
      if (!answeredRef.current) return
      answeredRef.current = false
      autosaveMutation.mutate({ sessionId: safeSessionId, answers: answersRef.current })
    }, 30_000)

    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current)
    }
  }, [session?.status, safeSessionId, autosaveMutation])

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
  const isSaving = autosaveMutation.isPending

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
        <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" />
          Submit
        </Button>
      </div>
    </div>
  )
}
