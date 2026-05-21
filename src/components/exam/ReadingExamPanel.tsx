import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ReadingViewer } from '@/components/exam/ReadingViewer'
import { AlertCircle } from 'lucide-react'
import type { ExamContentBody, FlatQuestion } from '@/api/trialExam'
import { RawHTMLContent } from '@/components/exam/RawHTMLContent'

// ============================================================
// Types
// ============================================================

interface ReadingPart {
  partIndex: number
  passage: string
  questions: FlatQuestion[]
  rawQuestionsHTML?: string
}

interface ReadingExamPanelProps {
  content: ExamContentBody
  rawQuestionsHTMLByPart?: string[]
  rawTotalQuestions?: number // Total questions count from raw play artifact
  answers: Record<string, unknown>
  onChange: (answers: Record<string, unknown>) => void
  disabled?: boolean
}

// ============================================================
// Question Navigator (sidebar)
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
    // Check if key matches q-X pattern and has a non-empty value
    if (k.startsWith('q-') && v !== null && v !== undefined && v !== '') {
      if (typeof v === 'string' && v.trim() !== '') {
        answered.add(k)
      } else if (typeof v === 'number') {
        answered.add(k)
      } else if (Array.isArray(v) && v.length > 0) {
        answered.add(k)
      }
    }
  })

  return (
    <Card className="sticky top-4 max-h-[calc(100vh-8rem)] overflow-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Questions ({questions.length})</CardTitle>
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
// Exam Questions Section (renders HTML with inputs)
// ============================================================

export function ExamQuestionsSection({
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
  const isInitialized = useRef(false)

  // Keep answersRef in sync with answers prop
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Initialize DOM inputs with saved answers (only once on mount)
  useEffect(() => {
    if (!containerRef.current || disabled || isInitialized.current) return
    isInitialized.current = true

    // Wait for DOM to be ready
    requestAnimationFrame(() => {
      if (!containerRef.current) return
      Object.entries(answers).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return

        const textInput = containerRef.current?.querySelector(
          `[name="${key}"][type="text"]`
        ) as HTMLInputElement | null
        if (textInput) {
          textInput.value = String(value)
          return
        }

        const radioInputs = containerRef.current?.querySelectorAll(
          `[name="${key}"][type="radio"]`
        ) as NodeListOf<HTMLInputElement>
        if (radioInputs) {
          radioInputs.forEach((radio) => {
            radio.checked = radio.value === String(value)
          })
          return
        }

        const checkboxInputs = containerRef.current?.querySelectorAll(
          `[name="${key}"][type="checkbox"]`
        ) as NodeListOf<HTMLInputElement>
        if (checkboxInputs && Array.isArray(value)) {
          checkboxInputs.forEach((cb) => {
            cb.checked = (value as string[]).includes(cb.value)
          })
          return
        }
      })
    })
  }, [disabled]) // Only run once on mount, answers handled separately

  // Use ref to always have access to latest onChange without re-running effect
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Listen to input changes
  useEffect(() => {
    if (disabled) return
    const container = containerRef.current
    if (!container) return

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement
      const name = target.name
      if (!name) return

      if (target.type === 'radio') {
        const radio = target as HTMLInputElement
        if (radio.checked) {
          const newAnswers = { ...answersRef.current, [name]: radio.value }
          answersRef.current = newAnswers
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
        const newAnswers = { ...answersRef.current, [name]: newValues }
        answersRef.current = newAnswers
        onChangeRef.current(newAnswers)
      } else if (target.tagName === 'SELECT') {
        const newAnswers = { ...answersRef.current, [name]: (target as HTMLSelectElement).value }
        answersRef.current = newAnswers
        onChangeRef.current(newAnswers)
      } else if (target.type === 'text') {
        const newAnswers = { ...answersRef.current, [name]: (target as HTMLInputElement).value }
        answersRef.current = newAnswers
        onChangeRef.current(newAnswers)
      }
    }

    container.addEventListener('change', handleChange)
    container.addEventListener('input', handleChange as EventListener)
    return () => {
      container.removeEventListener('change', handleChange)
      container.removeEventListener('input', handleChange as EventListener)
    }
  }, [disabled])

  // Use useMemo to only re-render HTML when questions change, not when answers change
  // This prevents DOM innerHTML from being replaced on every answer change
  const htmlContent = useMemo(() => {
    return questions
      .map((q) => q.html_question)
      .filter(Boolean)
      .join('\n')
  }, [questions])

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
// Reading Exam Panel
// ============================================================

export default function ReadingExamPanel({
  content,
  rawQuestionsHTMLByPart = [],
  rawTotalQuestions,
  answers,
  onChange,
  disabled = false,
}: ReadingExamPanelProps) {
  const [activePart, setActivePart] = useState(1)
  const [showNavigator, setShowNavigator] = useState(true)

  // Get raw questions HTML for current part (for fallback rendering)
  const currentPartRawQuestionsHTML = rawQuestionsHTMLByPart[activePart - 1] || ''

  // Build parts from content
  const parts: ReadingPart[] = useMemo(() => {
    if (content.parts && content.parts.length > 0) {
      return content.parts.map((part) => ({
        partIndex: part.partIndex,
        passage: part.passage || part.question || '',
        questions: part.questions || [],
      }))
    }

    // Fallback: single part
    return [
      {
        partIndex: 1,
        passage: content.passage || '',
        questions: content.questions || [],
      },
    ]
  }, [content])

  // All questions flat for navigator - use rawTotalQuestions if available
  const allQuestions = useMemo(() => {
    const parsedQuestions = parts.flatMap((p) => p.questions)
    
    // If we have raw questions HTML but less parsed questions, 
    // generate placeholder questions to match total
    if (rawTotalQuestions && parsedQuestions.length < rawTotalQuestions) {
      const placeholders: FlatQuestion[] = []
      for (let i = 1; i <= rawTotalQuestions; i++) {
        const existing = parsedQuestions.find(q => q.question_index === i)
        if (existing) {
          placeholders.push(existing)
        } else {
          placeholders.push({
            question_index: i,
            question: `Question ${i}`,
            html_question: '',
            question_type: 'multiple_choice',
            part_index: 1,
            group_index: 0,
          })
        }
      }
      return placeholders
    }
    
    return parsedQuestions
  }, [parts, rawTotalQuestions])

  const currentPart = parts.find((p) => p.partIndex === activePart) || parts[0]

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
            <CardTitle className="text-base">{content.title || 'Reading Trial Exam'}</CardTitle>
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

      {/* Part tabs + navigator layout */}
      <div className={`grid gap-6 ${showNavigator && allQuestions.length > 0 ? 'lg:grid-cols-[1fr_280px]' : 'grid-cols-1'}`}>
        {/* Main content */}
        <div className="space-y-6">
          {/* Part selector (for multi-part exams) */}
          {parts.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {parts.map((part, idx) => (
                <button
                  key={`part-${part.partIndex}-${idx}`}
                  onClick={() => setActivePart(part.partIndex)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    activePart === part.partIndex
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  Part {part.partIndex}
                </button>
              ))}
            </div>
          )}

          {/* Passage */}
          {currentPart.passage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                    Part {currentPart.partIndex}
                  </span>
                  Reading Passage {currentPart.partIndex}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReadingViewer
                  passage={currentPart.passage}
                  className="max-h-[500px] overflow-y-auto"
                />
              </CardContent>
            </Card>
          )}

          {/* Questions - Always render raw HTML for complex question types when available */}
          {currentPartRawQuestionsHTML ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <RawHTMLContent
                  key={`reading-${activePart}`}
                  html={currentPartRawQuestionsHTML}
                  answers={answers as Record<string, string | string[] | null>}
                  onChange={handleAnswerChange}
                  disabled={disabled}
                />
              </CardContent>
            </Card>
          ) : currentPart.questions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ExamQuestionsSection
                  questions={currentPart.questions}
                  answers={answers as Record<string, string | string[] | null>}
                  onChange={handleAnswerChange}
                  disabled={disabled}
                />
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No questions found for this part. The exam content may not be available yet.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Question Navigator sidebar */}
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
