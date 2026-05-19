import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExam, useStartAttempt, useExamHistory } from '@/api/exams'
import type { ExamMode } from '@/types/exam'
import { EXAM_MODE_LABELS, SKILL_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: exam, isLoading, error } = useExam(id!)
  const { data: history } = useExamHistory()
  const startMutation = useStartAttempt()

  const [selectedMode, setSelectedMode] = useState<ExamMode>('full_test')
  const [showConfirm, setShowConfirm] = useState(false)

  const previousAttempt = history?.find((h) => h.exam_id === id)

  const handleStart = async () => {
    if (!id) return

    if (selectedMode === 'trial') {
      navigate('/app/trial')
      return
    }

    try {
      const attempt = await startMutation.mutateAsync({ examId: id, mode: selectedMode })
      navigate(`/app/exams/session/${attempt.id}`)
    } catch {
      // error handled by hook
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900">Exam not found</h2>
        <p className="text-gray-500 mt-2">This exam may no longer be available.</p>
        <Button variant="outline" onClick={() => navigate('/app/exams')} className="mt-4">
          Back to Exams
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/app/exams')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12,19 5,12 12,5" />
        </svg>
        Back to Exams
      </button>

      {/* Hero */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
          {exam.thumbnail ? (
            <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-16 h-16 text-blue-400 mx-auto">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-blue-400 mt-2 font-medium">IELTS Mock Test</p>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">v{exam.version}</Badge>
                <Badge variant="secondary">{EXAM_MODE_LABELS[exam.mode] || exam.mode}</Badge>
                {exam.skill_count && (
                  <Badge variant="secondary">{exam.skill_count} skills</Badge>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {exam.price === 0 ? (
                <span className="text-2xl font-bold text-green-600">Free</span>
              ) : (
                <span className="text-2xl font-bold text-gray-900">
                  {exam.price.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400 ml-1">VND</span>
                </span>
              )}
            </div>
          </div>

          {exam.description && (
            <p className="text-gray-600 leading-relaxed">{exam.description}</p>
          )}

          {exam.instructions && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-1">Instructions</h3>
              <p className="text-sm text-amber-700">{exam.instructions}</p>
            </div>
          )}

          {exam.rules && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-1">Rules</h3>
              <p className="text-sm text-gray-600">{exam.rules}</p>
            </div>
          )}
        </div>
      </div>

      {/* Skills & Duration */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Exam Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {exam.skills?.map((skill) => (
            <div key={skill.skill_type} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-900">
                {SKILL_LABELS[skill.skill_type]}
              </p>
              <p className="text-sm text-gray-500 mt-1">{skill.question_count} questions</p>
              <p className="text-sm text-gray-400">{skill.duration} min</p>
            </div>
          ))}
          <div className="text-center p-4 bg-blue-50 rounded-lg col-span-2 sm:col-span-4">
            <p className="font-semibold text-gray-900">Total Duration</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{exam.duration} min</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Select Exam Mode</h2>
        <div className="space-y-3">
          {[
            { mode: 'trial' as ExamMode, label: 'Trial', desc: 'Free, unlimited time, practice at your own pace' },
            { mode: 'skill_practice' as ExamMode, label: 'Skill Practice', desc: 'Practice one skill at a time with time limit' },
            { mode: 'full_test' as ExamMode, label: 'Full Test', desc: 'Complete 4-skill IELTS exam under timed conditions' },
          ].map(({ mode, label, desc }) => (
            <label
              key={mode}
              className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                selectedMode === mode
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="exam-mode"
                value={mode}
                checked={selectedMode === mode}
                onChange={() => setSelectedMode(mode)}
                className="mt-1 w-4 h-4 text-blue-600 accent-blue-600"
              />
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Previous Attempt */}
      {previousAttempt && (
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Previous Attempt</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Status: <span className="font-medium text-gray-700">{previousAttempt.status}</span>
              </p>
              {previousAttempt.overall_band && (
                <p className="text-sm text-gray-500 mt-1">
                  Score: <span className="font-bold text-blue-600">{previousAttempt.overall_band.toFixed(1)}</span>
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/results/${previousAttempt.id}`)}
            >
              View Results
            </Button>
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={() => setShowConfirm(true)}
          className="px-8"
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? 'Starting...' : 'Start Exam'}
        </Button>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ready to start?</DialogTitle>
            <DialogDescription>
              {selectedMode === 'trial'
                ? 'You can practice at your own pace with no time limit.'
                : 'The timer will start immediately. Make sure you have a stable internet connection.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={startMutation.isPending}>
              {startMutation.isPending ? 'Starting...' : 'Start Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
