import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { ExamContentBody, FlatQuestion } from '@/api/trialExam'

// ============================================================
// Types
// ============================================================

interface ListeningPart {
  partIndex: number
  questions: FlatQuestion[]
  listeningTimes?: { label: string; start: number; end: number }[]
}

interface ListeningExamPanelProps {
  content: ExamContentBody
  answers: Record<string, unknown>
  onChange: (answers: Record<string, unknown>) => void
  disabled?: boolean
}

// ============================================================
// Audio Player with Time Markers
// ============================================================

function AudioPlayerWithTimes({
  src,
  times,
}: {
  src: string
  times?: { label: string; start: number; end: number }[]
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handlePlay = () => {}
  const handlePause = () => {}
  const handleEnded = () => {}

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Find which time segment we're in
  const activeTime = times?.find(
    (t) => currentTime >= t.start && currentTime < t.end
  )

  return (
    <div className="space-y-3">
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={src}
        controls
        className="w-full"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />

      {/* Time markers */}
      {times && times.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Time Markers</p>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => {
              const isActive = currentTime >= t.start && currentTime < t.end
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = t.start
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                  title={`Jump to ${formatTime(t.start)}`}
                >
                  <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`} />
                  {t.label}
                </button>
              )
            })}
          </div>
          {activeTime && (
            <p className="text-xs text-purple-600 font-medium">
              Now playing: {activeTime.label} ({formatTime(activeTime.start)} – {formatTime(activeTime.end)})
            </p>
          )}
        </div>
      )}

      {/* Playback speed */}
      {audioRef.current && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Speed:</span>
          {[0.75, 1, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.playbackRate = speed
                }
              }}
              className="text-xs px-2 py-0.5 rounded border hover:bg-gray-50 text-gray-600"
            >
              {speed}x
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Question Navigator
// ============================================================

function QuestionNavigator({
  questions,
  answers,
  onJumpTo,
}: {
  questions: FlatQuestion[]
  answers: Record<string, unknown>
  onJumpTo: (qIndex: number) => void
}) {
  const answered = new Set<string>()
  Object.entries(answers).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '' && (typeof v !== 'string' || v !== '')) {
      answered.add(k)
    }
  })

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Questions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-1">
          {questions.map((q, idx) => {
            const key = `q-${q.question_index}`
            const isAnswered = answered.has(key)
            return (
                <button
                  key={`${q.part_index ?? 'p'}-${q.question_index}-${idx}`}
                  onClick={() => onJumpTo(q.question_index)}
                className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                  isAnswered
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
                title={`Question ${q.question_index}${isAnswered ? ' (answered)' : ''}`}
              >
                {q.question_index}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Answered ({answered.size})
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            Unanswered ({questions.length - answered.size})
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Exam Questions Section
// ============================================================

function ExamQuestionsSection({
  questions,
  answers,
  onChange,
  disabled,
}: {
  questions: FlatQuestion[]
  answers: Record<string, string | string[] | null>
  onChange: (answers: Record<string, string | string[] | null>) => void
  disabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const answersRef = useRef(answers)
  const onChangeRef = useRef(onChange)

  // Keep refs in sync
  useEffect(() => {
    answersRef.current = answers
  }, [answers])
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Listen to input changes
  const handleChange = useCallback(
    (e: Event) => {
      if (disabled) return
      const target = e.target as HTMLInputElement | HTMLSelectElement
      const name = target.name
      if (!name) return

      if (target.type === 'radio') {
        const radio = target as HTMLInputElement
        if (radio.checked) {
          const newAnswers = { ...answersRef.current, [name]: radio.value }
          onChangeRef.current(newAnswers)
        }
      } else if (target.type === 'checkbox') {
        const checkbox = target as HTMLInputElement
        const currentValues = ((answersRef.current[name] as string[]) || [])
        let newValues: string[]
        if (checkbox.checked) {
          newValues = [...currentValues, checkbox.value]
        } else {
          newValues = currentValues.filter((v) => v !== checkbox.value)
        }
        onChangeRef.current({ ...answersRef.current, [name]: newValues })
      } else if (target.tagName === 'SELECT') {
        onChangeRef.current({ ...answersRef.current, [name]: (target as HTMLSelectElement).value })
      } else if (target.type === 'text') {
        onChangeRef.current({ ...answersRef.current, [name]: (target as HTMLInputElement).value })
      }
    },
    [disabled]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    // Sync initial values
    Object.entries(answers).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return

      const textInput = container.querySelector(
        `[name="${key}"][type="text"]`
      ) as HTMLInputElement | null
      if (textInput) {
        textInput.value = String(value)
        return
      }

      const radioInputs = container.querySelectorAll(
        `[name="${key}"][type="radio"]`
      ) as NodeListOf<HTMLInputElement>
      if (radioInputs) {
        radioInputs.forEach((radio) => {
          radio.checked = radio.value === String(value)
        })
      }
    })

    container.addEventListener('change', handleChange)
    container.addEventListener('input', handleChange as EventListener)
    return () => {
      container.removeEventListener('change', handleChange)
      container.removeEventListener('input', handleChange as EventListener)
    }
  }, [answers, handleChange, disabled])

  const htmlContent = questions
    .map((q) => q.html_question)
    .filter(Boolean)
    .join('\n')

  if (!htmlContent) return null

  return (
    <div
      ref={containerRef}
      className="exam-questions-html space-y-3"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

// ============================================================
// Listening Exam Panel
// ============================================================

export default function ListeningExamPanel({
  content,
  answers,
  onChange,
  disabled = false,
}: ListeningExamPanelProps) {
  const [showNavigator, setShowNavigator] = useState(true)

  // Build parts from content
  const parts: ListeningPart[] = useMemo(() => {
    if (content.parts && content.parts.length > 0) {
      return content.parts.map((part) => ({
        partIndex: part.partIndex,
        questions: part.questions || [],
        listeningTimes: part.listening_times,
      }))
    }

    // Fallback: single part
    return [
      {
        partIndex: 1,
        questions: content.questions || [],
      },
    ]
  }, [content])

  const allQuestions = useMemo(
    () => parts.flatMap((p) => p.questions),
    [parts]
  )

  const handleAnswerChange = useCallback(
    (newAnswers: Record<string, unknown>) => {
      onChange(newAnswers)
    },
    [onChange]
  )

  const scrollToQuestion = useCallback((qIndex: number) => {
    const el = document.querySelector(`[data-question-index="${qIndex}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const answeredCount = Object.entries(answers).filter(
    ([k, v]) => k.startsWith('q-') && v !== null && v !== '' && v !== undefined
  ).length

  return (
    <div className="space-y-6">
      {/* Title */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{content.title || 'Listening Trial Exam'}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {answeredCount}/{allQuestions.length} answered
              </span>
              <button
                onClick={() => setShowNavigator(!showNavigator)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {showNavigator ? 'Hide' : 'Show'} navigator
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Layout: main content + navigator */}
      <div className={`grid gap-6 ${showNavigator && allQuestions.length > 0 ? 'lg:grid-cols-[1fr_220px]' : 'grid-cols-1'}`}>
        {/* Main */}
        <div className="space-y-6">
          {/* Audio player */}
          {content.media_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <AudioPlayerWithTimes
                  src={content.media_url}
                  times={parts[0]?.listeningTimes}
                />
              </CardContent>
            </Card>
          )}

          {/* Questions by part */}
          {parts.map((part, idx) => (
            <div key={`listening-part-${part.partIndex}-${idx}`} className="space-y-4">
              {parts.length > 1 && (
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Part {part.partIndex}
                </h3>
              )}
              {part.questions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ExamQuestionsSection
                      questions={part.questions}
                      answers={answers as Record<string, string | string[] | null>}
                      onChange={handleAnswerChange}
                      disabled={disabled}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {/* Empty state */}
          {allQuestions.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No questions found for this exam. The exam content may not be available yet.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Navigator */}
        {showNavigator && allQuestions.length > 0 && (
          <QuestionNavigator
            questions={allQuestions}
            answers={answers as Record<string, string | string[] | null>}
            onJumpTo={scrollToQuestion}
          />
        )}
      </div>
    </div>
  )
}
