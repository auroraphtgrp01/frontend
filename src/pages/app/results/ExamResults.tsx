import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useAttemptResults, useAttempt, type AttemptRuntime } from '@/api/attempts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

function asBand(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatBand(value: unknown, pendingGrading: boolean) {
  const band = asBand(value)
  if (band != null) return band.toFixed(1)
  return pendingGrading ? 'Pending' : '—'
}

function bandProgress(value: unknown) {
  const band = asBand(value)
  return band == null ? 0 : (band / 9) * 100
}

export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const runtime: AttemptRuntime = location.pathname.includes('/practice/') ? 'practice' : 'exam'
  const resultBasePath = runtime === 'practice' ? '/app/practice/results' : '/app/results'
  const listBasePath = runtime === 'practice' ? '/app/packages' : '/app/exams'
  const { data: result, isLoading, error } = useAttemptResults(id!, { runtime })
  const { data: attempt } = useAttempt(id!, { runtime })

  const overall = asBand(result?.overall_band)
  const skills = [
    { label: 'Listening', band: asBand(result?.listening_band), color: 'from-blue-500 to-blue-600' },
    { label: 'Reading', band: asBand(result?.reading_band), color: 'from-green-500 to-green-600' },
    { label: 'Writing', band: asBand(result?.writing_band), color: 'from-amber-500 to-amber-600' },
    { label: 'Speaking', band: asBand(result?.speaking_band), color: 'from-purple-500 to-purple-600' },
  ]

  const isPendingGrading =
    !!result &&
    (result.visible === false ||
      result.grading_state === 'processing' ||
      result.grading_status === 'pending')
  const displayedSkills =
    runtime === 'practice' && result?.skill
      ? skills.filter((skill) => skill.label.toLowerCase() === String(result.skill).toLowerCase())
      : skills

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 p-6 max-w-4xl mx-auto text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900">Results not available</h2>
        <p className="text-gray-500 mt-2">
          We could not load your results yet. Please try again in a moment.
        </p>
        <Button variant="outline" onClick={() => navigate(listBasePath)} className="mt-4">
          {runtime === 'practice' ? 'Back to Packages' : 'Back to Exams'}
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(listBasePath)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12,19 5,12 12,5" />
        </svg>
        {runtime === 'practice' ? 'Back to Packages' : 'Back to Exams'}
      </button>

      {/* Overall Score */}
      <div className="bg-white rounded-2xl border shadow-sm p-8 mb-6 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Your Result</h1>
        <p className="text-gray-500 text-sm mb-8">
          {attempt?.exam_title || 'IELTS Mock Test'}
        </p>

        <div className="relative inline-flex items-center justify-center mb-8">
          <svg className="w-48 h-48 transform -rotate-90">
            <circle cx="96" cy="96" r="80" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeDasharray={`${((overall ?? 0) / 9) * 502.65} 502.65`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-black text-gray-900 ${overall == null ? 'text-2xl' : 'text-5xl'}`}>
              {formatBand(overall, isPendingGrading)}
            </span>
            <span className="text-sm text-gray-400 font-medium">Overall Band</span>
          </div>
        </div>

        {isPendingGrading && (
          <Badge variant="warning" className="mb-4">
            Your answers are being graded. This page refreshes automatically.
          </Badge>
        )}
      </div>

      {/* Skill Breakdown */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Skill Breakdown</h2>
        <div
          className={`grid gap-4 ${
            displayedSkills.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {displayedSkills.map((skill) => (
            <div key={skill.label} className="text-center">
              <div className={`font-black text-gray-900 mb-1 ${skill.band == null ? 'text-sm' : 'text-3xl'}`}>
                {formatBand(skill.band, isPendingGrading)}
              </div>
              <div className={`text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r ${skill.color}`}>
                {skill.label}
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                  style={{ width: `${bandProgress(skill.band)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate(listBasePath)}>
          {runtime === 'practice' ? 'Back to Packages' : 'Back to Exams'}
        </Button>
        <Button
          disabled={isPendingGrading}
          onClick={() => navigate(`${resultBasePath}/${id}/detail`)}
        >
          View Detailed Results
        </Button>
      </div>
    </div>
  )
}
