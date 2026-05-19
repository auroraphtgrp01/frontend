import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExams, type ExamFilters } from '@/api/exams'
import { useExamHistory } from '@/api/exams'
import { ExamCard } from '@/components/exam/ExamCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function ExamListPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ExamFilters>({ limit: 50 })
  const [search, setSearch] = useState('')

  const { data: exams, isLoading, error } = useExams(filters)
  const { data: history } = useExamHistory()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, q: search }))
  }

  const handleModeFilter = (mode: string) => {
    setFilters((f) => ({
      ...f,
      mode: f.mode === mode ? undefined : (mode as ExamFilters['mode']),
    }))
  }

  const getLatestAttempt = (examId: string) => {
    return history?.find((h) => h.exam_id === examId)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lịch thi</h1>
        <p className="text-gray-500 mt-1">
          Xem và làm các bài thi IELTS mock. Chọn chế độ phù hợp với nhu cầu luyện tập của bạn.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exams..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" variant="default" size="sm">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          {['trial', 'skill_practice', 'full_test'].map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeFilter(mode)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                filters.mode === mode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {mode === 'trial'
                ? 'Trial'
                : mode === 'skill_practice'
                ? 'Skill Practice'
                : 'Full Test'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border overflow-hidden">
              <Skeleton className="h-36 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-red-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Failed to load exams</h3>
          <p className="text-gray-500 mt-1">Something went wrong. Please try again.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      )}

      {exams && exams.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-gray-400">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No exams found</h3>
          <p className="text-gray-500 mt-1">
            {filters.q ? `No exams match "${filters.q}"` : 'No exams are available right now.'}
          </p>
        </div>
      )}

      {exams && exams.data.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Showing {exams.data.length} exam{exams.data.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {exams.data.map((exam, i) => (
              <ExamCard
                key={exam.id ?? `exam-${i}`}
                exam={exam}
                latestAttempt={getLatestAttempt(exam.id)}
                onStart={(examId) => navigate(`/app/exams/${examId}/detail`)}
                onViewResults={(attemptId) => navigate(`/app/results/${attemptId}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
