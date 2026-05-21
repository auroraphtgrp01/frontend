import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useTrialSession,
  useSubmitTrial,
  useTrialResult,
  useUploadSpeakingAudio,
  useTrialExamContent,
  type ExamContentBody,
  type RawPlayArtifact,
} from '@/api/trialExam'
import {
  useTrialExamAutosave,
  saveTrialSessionToStorage,
  loadTrialSessionFromStorage,
  clearTrialSessionFromStorage,
} from '@/hooks/useTrialExamAutosave'
import { parseAllQuestions } from '@/utils/parseExamHTML'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ReadingExamPanel from '@/components/exam/ReadingExamPanel'
import ListeningExamPanel from '@/components/exam/ListeningExamPanel'
import WritingExamPanel from '@/components/exam/WritingExamPanel'
import SpeakingExamPanel from '@/components/exam/SpeakingExamPanel'
import { SubmitConfirmDialog } from '@/components/exam/SubmitConfirmDialog'
import { Loader2, Clock, CheckCircle, AlertCircle, Send, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ============================================================
// Raw Play Parser - Convert raw play.json to ExamContentBody
// ============================================================

function parseRawPlay(play: RawPlayArtifact, skill: string): ExamContentBody {
  const parts: ExamContentBody['parts'] = []

  for (const part of play.parts) {
    // Extract passage text from part.question (HTML content)
    const passage = part.question || ''

    // Extract questions from question_groups
    const questions: ExamContentBody['questions'] = []

    for (const group of part.question_groups) {
      if (group.question) {
        // Parse HTML questions from group.question
        const parsedQuestions = parseAllQuestions(group.question)
        for (const pq of parsedQuestions) {
          questions.push({
            question_index: pq.question_index,
            question: pq.question,
            html_question: pq.html_question,
            question_type: pq.question_type,
            part_index: part.part_index,
            group_index: group.group_index,
            options: pq.options,
          })
        }
      }
    }

    // Add part with parsed questions
    parts.push({
      partIndex: part.part_index,
      passage: passage,
      question: passage,
      questions: questions,
      listening_times: part.listening_times?.map((t) => ({
        label: t.label,
        start: t.start,
        end: t.end,
      })),
    })
  }

  // For writing/speaking: extract prompt from first part's question
  const prompt = play.parts[0]?.question || ''

  return {
    exam_uuid: play.exam_uuid || '',
    title: play.title,
    type: play.type,
    skill: skill,
    prompt: play.parts[0]?.question || '',
    parts: parts,
    questions: parts.flatMap((p) => p.questions || []),
    passage: parts[0]?.passage,
  }
}

// Unwrap content from /content endpoint response
// New format: { session_id, skill, status, answers, remaining_seconds, play: <raw artifact> }
// Old format (fallback): { exam_content: ExamContentBody }
// Legacy format: direct ExamContentBody
function unwrapContent(data: unknown, skill: string): {
  content: ExamContentBody | undefined
  meta: Record<string, unknown> | null
  play: RawPlayArtifact | undefined
} {
  if (!data) return { content: undefined, meta: null, play: undefined }
  const d = data as Record<string, unknown>

  // New format: has play property with raw artifact
  if (d.play) {
    const play = d.play as RawPlayArtifact
    const parsed = parseRawPlay(play, skill)
    return {
      content: parsed,
      meta: d,
      play,
    }
  }

  // Old format: has exam_content property
  if (d.exam_content) {
    return {
      content: d.exam_content as ExamContentBody,
      meta: d,
      play: undefined,
    }
  }

  // Legacy format: direct content
  return {
    content: data as ExamContentBody,
    meta: null,
    play: undefined,
  }
}

// Helper to count questions from raw HTML by finding unique question indices
function countQuestionsFromRawHTML(rawHTML: string): number {
  if (!rawHTML) return 0
  const matches = rawHTML.match(/name="q-(\d+)"/g) || []
  const indices = new Set(matches.map(m => parseInt(m.match(/q-(\d+)/)?.[1] || '0', 10)))
  return indices.size
}

export default function TrialExamSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const safeSessionId =
    sessionId && sessionId !== 'undefined' && sessionId !== 'null' ? sessionId : ''

  const { data: session, isLoading: sessionLoading } = useTrialSession(safeSessionId)
  const { data: result } = useTrialResult(safeSessionId)
  const submitMutation = useSubmitTrial()
  const uploadMutation = useUploadSpeakingAudio()

  const {
    data: contentRaw,
    isLoading: contentLoading,
    error: contentError,
  } = useTrialExamContent(safeSessionId || undefined)

  const { content, meta: sessionMeta, play } = unwrapContent(contentRaw, session?.skill || 'reading')

  // Debug: log content API response
  useEffect(() => {
    if (contentRaw) {
      console.debug('[content] API response:', { 
        hasContent: !!content, 
        hasMeta: !!sessionMeta,
        answers: sessionMeta?.answers,
        contentKeys: content ? Object.keys(content) : []
      })
    }
  }, [contentRaw, content, sessionMeta])

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [essayText, setEssayText] = useState('')
  const [audioBlob, setAudioBlob] = useState<{ blob: Blob; duration: number } | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const submittingRef = useRef(false)
  const sessionIdRef = useRef(safeSessionId)
  sessionIdRef.current = safeSessionId
  const audioBlobRef = useRef(audioBlob)
  audioBlobRef.current = audioBlob

  // Restore from /content endpoint (primary) or localStorage (fallback)
  useEffect(() => {
    if (!safeSessionId) return

    console.log('[restore] effect fired, sessionMeta:', !!sessionMeta, 'answers keys:', sessionMeta?.answers ? Object.keys(sessionMeta.answers).length : 'none')

    // Priority 1: answers from /content endpoint
    if (sessionMeta?.answers && Object.keys(sessionMeta.answers as object).length > 0) {
      console.log('[restore] setting from server answers')
      setAnswers(sessionMeta.answers as Record<string, unknown>)
      setIsDirty(false) // server sync, not dirty
      const essay = (sessionMeta.answers as Record<string, unknown>)['essay_text']
      if (typeof essay === 'string') {
        setEssayText(essay)
      }
    } else {
      // No answers from server, ensure not dirty
      console.log('[restore] no server answers, setting isDirty=false')
      setIsDirty(false)
    }

    // Priority 2: localStorage (only if no server answers)
    const saved = loadTrialSessionFromStorage(safeSessionId)
    if (
      saved &&
      (!sessionMeta?.answers || Object.keys(sessionMeta.answers as object).length === 0)
    ) {
      console.log('[restore] restoring from localStorage')
      setAnswers(saved.answers)
      setEssayText(saved.essayText)
      setIsDirty(true) // from localStorage, consider as user changes
      toast.info('Your previous progress has been restored.')
    }
  }, [safeSessionId, sessionMeta])

  // Debug: log when answers change
  useEffect(() => {
    console.debug('[TrialExamSessionPage] answers updated:', {
      keys: Object.keys(answers),
      count: Object.keys(answers).length
    })
  }, [answers])

  // Persist to localStorage
  useEffect(() => {
    if (!safeSessionId || !session || session.status !== 'in_progress') return
    saveTrialSessionToStorage(safeSessionId, { answers, essayText })
  }, [answers, essayText, safeSessionId, session?.status])

  // Guard: redirect if sessionId is invalid
  useEffect(() => {
    if (sessionId && (sessionId === 'undefined' || sessionId === 'null' || sessionId === '')) {
      navigate('/app/trial')
    }
  }, [sessionId, navigate])

  // Autosave
  const {
    isSaving,
    saveNow,
    isOffline,
    lastSavedAt,
    pendingOfflineCount,
  } = useTrialExamAutosave({
    sessionId: safeSessionId,
    answers,
    essayText,
    enabled: session?.status === 'in_progress' && !!(content && !contentLoading),
    isDirty,
    serverSeq: (sessionMeta?.client_seq as number | undefined) ?? 0,
  })

  // Trigger immediate save when restored from localStorage
  const isRestoredRef = useRef(false)
  useEffect(() => {
    console.log('[autosave-restore] isDirty:', isDirty, 'status:', session?.status, 'restored:', isRestoredRef.current)
    if (isDirty && session?.status === 'in_progress' && !isRestoredRef.current) {
      isRestoredRef.current = true
      console.log('[autosave-restore] triggering immediate save after localStorage restore')
      saveNow({ force: true })
    }
  }, [isDirty, session?.status, saveNow])

  const handleAnswerChange = useCallback((newAnswers: Record<string, unknown>) => {
    console.log('[TrialExamSessionPage] handleAnswerChange keys:', Object.keys(newAnswers).filter(k => k.startsWith('q-')).join(', '))
    setAnswers(newAnswers)
    setIsDirty(true) // user change
  }, [])

  const handleEssayChange = useCallback((text: string) => {
    setEssayText(text)
    setIsDirty(true) // user change
    setAnswers((prev) => ({ ...prev, essay_text: text }))
  }, [])

  const handleRecordingComplete = useCallback((blob: Blob, _duration: number) => {
    setAudioBlob({ blob, duration: _duration })
    toast.success('Recording saved. Submit to upload.')
  }, [])

  const handleSubmitClick = useCallback(() => {
    setShowSubmitDialog(true)
  }, [])

  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true

    const currentSessionId = sessionIdRef.current
    const currentAudio = audioBlobRef.current

    setShowSubmitDialog(false)

    try {
      if (currentAudio) {
        const file = new File([currentAudio.blob], 'recording.webm', { type: 'audio/webm' })
        await uploadMutation.mutateAsync({ sessionId: currentSessionId, file })
      }

      await saveNow({ force: true })

      await submitMutation.mutateAsync(currentSessionId)

      clearTrialSessionFromStorage(currentSessionId)

      navigate('/app/trial')
    } catch {
      submittingRef.current = false
    }
  }, [uploadMutation, saveNow, submitMutation, navigate])

  // Derived (must be before useEffect that uses effectiveTimeLeft)
  const effectiveTimeLeft =
    (sessionMeta?.remaining_seconds as number | undefined) ?? timeLeft
  const isSubmitting = submitMutation.isPending || uploadMutation.isPending

  // Countdown timer
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return

    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000),
      )
      setTimeLeft(left)

      if (left === 0 && !submittingRef.current) {
        toast.error('Time is up! Submitting your answers...')
        doSubmit()
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.expires_at, session?.status, doSubmit])

  // Expiry warnings
  useEffect(() => {
    if (effectiveTimeLeft === null || !session || session.status !== 'in_progress') return
    if (effectiveTimeLeft === 5 * 60) {
      toast.warning('5 minutes remaining! Please finish your answers.')
    } else if (effectiveTimeLeft === 60) {
      toast.error('1 minute remaining! Submit now!')
    }
  }, [effectiveTimeLeft, session?.status])

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!session) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Session not found.</AlertDescription>
      </Alert>
    )
  }

  if (session.status !== 'in_progress') {
    if (!result) {
      return (
        <div className="mx-auto max-w-2xl p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Submitted. Waiting for grading results...
          </p>
        </div>
      )
    }

    if (!result.visible_to_student) {
      return (
        <div className="mx-auto max-w-2xl p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Your result is not yet available. A teacher is reviewing your{' '}
            {session.skill} exam.
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
              Submitted on{' '}
              {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.band_score !== null && (
              <div className="text-5xl font-bold text-center">
                {result.band_score.toFixed(1)}
              </div>
            )}
            {result.correct_count !== null && result.total_questions !== null && (
              <p className="text-center text-muted-foreground">
                {result.correct_count} / {result.total_questions} correct
              </p>
            )}
            {result.ai_criteria && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(result.ai_criteria).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex justify-between bg-muted rounded px-2 py-1"
                  >
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium">
                      {typeof val === 'number' ? val.toFixed(1) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
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

  if (contentError) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{String(contentError)}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize">
            {session?.skill ?? '...'} Trial Exam
          </h1>
          <p className="text-sm text-muted-foreground">
            {content?.title ?? `Exam UUID: ${session?.exam_uuid ?? ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOffline && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              <WifiOff className="h-3 w-3" />
              <span>
                {pendingOfflineCount > 0 ? `${pendingOfflineCount} queued` : 'Offline'}
              </span>
            </div>
          )}
          {!isOffline && lastSavedAt && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Wifi className="h-3 w-3" />
              <span>Saved {lastSavedAt.toLocaleTimeString()}</span>
            </div>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {effectiveTimeLeft !== null && (
            <div
              className={`rounded-lg px-4 py-2 text-xl font-mono font-bold ${
                effectiveTimeLeft < 300
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : 'bg-muted'
              }`}
            >
              <Clock className="inline mr-1 h-5 w-5" />
              {formatTime(effectiveTimeLeft)}
            </div>
          )}

          {/* Autosave status */}
          <div className="flex items-center gap-2 text-xs">
            {isOffline ? (
              <span className="flex items-center gap-1 text-orange-500">
                <WifiOff className="h-3.5 w-3.5" />
                Offline
                {pendingOfflineCount > 0 && ` (${pendingOfflineCount} pending)`}
              </span>
            ) : isSaving ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                Saved {lastSavedAt.toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Loading */}
      {contentLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      )}

      {/* Skill panels */}
      {content && !contentLoading && session?.skill === 'reading' && (
        <ReadingExamPanel
          content={content}
          rawQuestionsHTMLByPart={play?.parts.map(p => p.question_groups.map(g => g.question).join('')) || []}
          rawTotalQuestions={play?.parts.reduce((sum, p) => sum + p.question_groups.reduce((s, g) => s + countQuestionsFromRawHTML(g.question || ''), 0), 0) || 0}
          answers={answers}
          onChange={handleAnswerChange}
          disabled={false}
        />
      )}

      {content && !contentLoading && session?.skill === 'listening' && (
        <ListeningExamPanel
          content={content}
          answers={answers}
          onChange={handleAnswerChange}
          disabled={false}
        />
      )}

      {content && !contentLoading && session?.skill === 'writing' && (
        <WritingExamPanel
          content={content}
          essayText={essayText}
          onEssayChange={handleEssayChange}
          disabled={false}
        />
      )}

      {content && !contentLoading && session?.skill === 'speaking' && (
        <SpeakingExamPanel
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
        <Button
          onClick={handleSubmitClick}
          disabled={isSubmitting || submittingRef.current}
          className="gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" />
          Submit
        </Button>
      </div>

      {/* Submit dialog */}
      <SubmitConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        unansweredCount={
          content?.questions
            ? content.questions.length -
              Object.keys(answers).filter(
                (k) =>
                  k.startsWith('q-') &&
                  answers[k] !== null &&
                  answers[k] !== '' &&
                  answers[k] !== undefined,
              ).length
            : 0
        }
        onConfirm={doSubmit}
        skillName={session?.skill}
      />
    </div>
  )
}
