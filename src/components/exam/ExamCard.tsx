import type { Exam } from '@/types/exam'
import { EXAM_MODE_LABELS } from '@/lib/constants'

interface ExamCardProps {
  exam: Exam
  onStart?: (examId: string) => void
  onViewResults?: (attemptId: string) => void
  latestAttempt?: { id: string; status: string }
  className?: string
}

export function ExamCard({
  exam,
  onStart,
  onViewResults,
  latestAttempt,
  className = '',
}: ExamCardProps) {
  const hasAttempt = !!latestAttempt
  const isCompleted = latestAttempt?.status === 'completed' || latestAttempt?.status === 'graded'

  return (
    <div
      className={`group relative bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden ${className}`}
    >
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden">
        {exam.thumbnail ? (
          <img
            src={exam.thumbnail}
            alt={exam.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-blue-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-12 h-12"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium">IELTS</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{exam.title}</h3>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            v{exam.version}
          </span>
        </div>

        {exam.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{exam.description}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {EXAM_MODE_LABELS[exam.mode] ?? exam.mode ?? '—'}
          </span>
          {exam.skill_count != null && exam.skill_count > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {exam.skill_count} skills
            </span>
          )}
          {exam.duration != null && exam.duration > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {exam.duration} min
            </span>
          )}
          {exam.price === 0 ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Free
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              {exam.price != null ? exam.price.toLocaleString() : '—'} VND
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="flex gap-2">
          {isCompleted ? (
            <button
              onClick={() => latestAttempt && onViewResults?.(latestAttempt.id)}
              className="flex-1 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
            >
              View Results
            </button>
          ) : hasAttempt ? (
            <button
              onClick={() => onStart?.(exam.id)}
              className="flex-1 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => onStart?.(exam.id)}
              className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
