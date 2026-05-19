import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useAttemptResults, useAttempt, type AttemptRuntime } from '@/api/attempts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { QuestionResult, QuestionResultStatus } from '@/types/exam'

function asBand(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const STATUS_LABEL: Record<QuestionResultStatus, string> = {
  correct: 'Correct',
  incorrect: 'Incorrect',
  unanswered: 'Not answered',
}

const STATUS_VARIANT: Record<QuestionResultStatus, 'success' | 'destructive' | 'secondary'> = {
  correct: 'success',
  incorrect: 'destructive',
  unanswered: 'secondary',
}

function formatQuestionLabel(questionId: string) {
  const match = /^q(\d+)$/i.exec(questionId.trim())
  return match ? `Question ${match[1]}` : questionId
}

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const runtime: AttemptRuntime = location.pathname.includes('/practice/') ? 'practice' : 'exam'
  const resultBasePath = runtime === 'practice' ? '/app/practice/results' : '/app/results'
  const listBasePath = runtime === 'practice' ? '/app/packages' : '/app/exams'
  const { data: result, isLoading } = useAttemptResults(id!, { runtime })
  const { data: attempt } = useAttempt(id!, { runtime })

  const isPendingGrading =
    !!result &&
    (result.visible === false ||
      result.grading_state === 'processing' ||
      result.grading_status === 'pending')

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full mb-4" />
        ))}
      </div>
    )
  }

  if (!result) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16">
        <p className="text-gray-500">Results not found.</p>
        <Button variant="outline" onClick={() => navigate(listBasePath)} className="mt-4">
          {runtime === 'practice' ? 'Back to Packages' : 'Back to Exams'}
        </Button>
      </div>
    )
  }

  if (isPendingGrading) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900">Grading in progress</h2>
        <p className="text-gray-500 mt-2">
          Detailed question breakdown will be available once grading completes.
        </p>
        <Button variant="outline" onClick={() => navigate(`${resultBasePath}/${id}`)} className="mt-4">
          Back to Overview
        </Button>
      </div>
    )
  }

  const activeSkill = result.skill?.toLowerCase()
  const skillResults = [
    {
      skill: 'listening' as const,
      label: 'Listening',
      band: asBand(result.listening_band),
      score: result.skill_results?.find((s) => s.skill_type === 'listening')?.score ?? 0,
      maxScore: result.skill_results?.find((s) => s.skill_type === 'listening')?.max_score ?? 40,
      color: 'blue',
      questions: result.skill_results?.find((s) => s.skill_type === 'listening')?.questions,
    },
    {
      skill: 'reading' as const,
      label: 'Reading',
      band: asBand(result.reading_band),
      score: result.skill_results?.find((s) => s.skill_type === 'reading')?.score ?? result.raw_score ?? 0,
      maxScore: result.skill_results?.find((s) => s.skill_type === 'reading')?.max_score ?? 40,
      color: 'green',
      questions: result.skill_results?.find((s) => s.skill_type === 'reading')?.questions,
    },
    {
      skill: 'writing' as const,
      label: 'Writing',
      band: asBand(result.writing_band),
      score: 0,
      maxScore: 0,
      color: 'amber',
      aiFeedback: result.skill_results?.find((s) => s.skill_type === 'writing')?.ai_feedback,
      teacherFeedback: result.skill_results?.find((s) => s.skill_type === 'writing')?.teacher_feedback,
    },
    {
      skill: 'speaking' as const,
      label: 'Speaking',
      band: asBand(result.speaking_band),
      score: 0,
      maxScore: 0,
      color: 'purple',
      aiFeedback: result.skill_results?.find((s) => s.skill_type === 'speaking')?.ai_feedback,
      teacherFeedback: result.skill_results?.find((s) => s.skill_type === 'speaking')?.teacher_feedback,
      audioUrl: result.skill_results?.find((s) => s.skill_type === 'speaking')?.examiner_comments,
    },
  ]

  const displayedSkills =
    runtime === 'practice' && activeSkill
      ? skillResults.filter((sr) => sr.skill === activeSkill)
      : skillResults.filter((sr) => sr.band != null || (sr.questions?.length ?? 0) > 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(`${resultBasePath}/${id}`)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12,19 5,12 12,5" />
        </svg>
        Back to Overview
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Detailed Results</h1>
      <p className="text-gray-500 mb-6">{attempt?.exam_title || 'IELTS Mock Test'}</p>

      <div className="space-y-6">
        {displayedSkills.map((sr) => (
          <div key={sr.skill} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900">{sr.label}</h2>
                {sr.band != null && (
                  <Badge
                    variant={sr.band >= 7 ? 'success' : sr.band >= 5 ? 'secondary' : 'destructive'}
                  >
                    Band {sr.band.toFixed(1)}
                  </Badge>
                )}
              </div>
              {(sr.skill === 'listening' || sr.skill === 'reading') && sr.maxScore > 0 && (
                <span className="text-sm text-gray-500">
                  {sr.score}/{sr.maxScore} correct
                </span>
              )}
            </div>

            <div className="p-4">
              {(sr.skill === 'listening' || sr.skill === 'reading') && sr.questions && sr.questions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Review each question: your answer, correct answer, and result.
                  </p>
                  {sr.questions.map((question) => (
                    <QuestionBreakdownRow key={question.question_id} question={question} />
                  ))}
                </div>
              )}

              {(sr.skill === 'listening' || sr.skill === 'reading') && (!sr.questions || sr.questions.length === 0) && (
                <div className="text-sm text-gray-600">
                  <p>
                    Score: <strong>{sr.score}/{sr.maxScore}</strong> questions correct.
                    {sr.band != null && (
                      <>
                        {' '}
                        Band score: <strong>{sr.band.toFixed(1)}</strong>.
                      </>
                    )}
                  </p>
                </div>
              )}

              {(sr.skill === 'writing' || sr.skill === 'speaking') && (
                <div className="space-y-4">
                  {sr.aiFeedback && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <h3 className="font-semibold text-blue-800 text-sm mb-2">AI Feedback</h3>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{sr.aiFeedback}</p>
                    </div>
                  )}
                  {sr.teacherFeedback && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                      <h3 className="font-semibold text-green-800 text-sm mb-2">Teacher Feedback</h3>
                      <p className="text-sm text-green-700 whitespace-pre-wrap">{sr.teacherFeedback}</p>
                    </div>
                  )}
                  {!sr.aiFeedback && !sr.teacherFeedback && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 text-center">
                      Feedback will be available after grading.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={() => navigate(listBasePath)}>
          {runtime === 'practice' ? 'Back to Packages' : 'Back to Exams'}
        </Button>
      </div>
    </div>
  )
}

function QuestionBreakdownRow({ question }: { question: QuestionResult }) {
  const correctAnswers = question.correct_answers?.filter(Boolean) ?? []
  const yourAnswer = question.your_answer?.trim() ?? ''

  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium text-gray-900">{formatQuestionLabel(question.question_id)}</span>
        <Badge variant={STATUS_VARIANT[question.status]}>{STATUS_LABEL[question.status]}</Badge>
      </div>
      <div className="grid gap-1 text-gray-600">
        <p>
          <span className="text-gray-500">Your answer:</span>{' '}
          <strong className="text-gray-900">{yourAnswer || '—'}</strong>
        </p>
        {question.status !== 'unanswered' && correctAnswers.length > 0 && (
          <p>
            <span className="text-gray-500">Correct answer:</span>{' '}
            <strong className="text-gray-900">{correctAnswers.join(' / ')}</strong>
          </p>
        )}
      </div>
    </div>
  )
}
