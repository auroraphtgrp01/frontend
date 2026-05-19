import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExamAttemptProvider, useExamAttempt } from '@/contexts/ExamAttemptContext'
import type { ExamAttempt, SkillType } from '@/types/exam'

// ============================================================
// Helper: format seconds to HH:MM:SS
// ============================================================

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ============================================================
// ExamTimer Component
// ============================================================

interface ExamTimerProps {
  expiresAt?: string
  initialSeconds?: number
  onExpire?: () => void
  className?: string
}

export function ExamTimer({
  initialSeconds,
  onExpire,
  className = '',
}: ExamTimerProps) {
  const { timeRemaining, isTimerWarning, isTimerCritical, setTimeRemaining } = useExamAttempt()

  useEffect(() => {
    if (initialSeconds !== undefined) {
      setTimeRemaining(initialSeconds)
    }
  }, [initialSeconds, setTimeRemaining])

  useEffect(() => {
    if (timeRemaining === 0 && initialSeconds !== undefined && initialSeconds > 0) {
      onExpire?.()
    }
  }, [timeRemaining, onExpire, initialSeconds])

  const colorClass = isTimerCritical
    ? 'text-red-600 animate-pulse'
    : isTimerWarning
    ? 'text-yellow-600'
    : 'text-green-600'

  const bgClass = isTimerCritical
    ? 'bg-red-50 border-red-200'
    : isTimerWarning
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-green-50 border-green-200'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border font-mono text-lg font-bold ${bgClass} ${colorClass} ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formatTime(timeRemaining)}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="w-5 h-5"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      <span>{formatTime(timeRemaining)}</span>
      {isTimerCritical && (
        <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
          Final minute
        </span>
      )}
      {isTimerWarning && !isTimerCritical && (
        <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">
          Hurry up
        </span>
      )}
    </div>
  )
}

// ============================================================
// ProgressTracker Component
// ============================================================

interface ProgressTrackerProps {
  skills: Array<{
    skill_type: SkillType
    status: string
  }>
  currentSkill?: SkillType | null
  onSelectSkill?: (skill: SkillType) => void
  className?: string
}

const SKILL_ICONS: Record<SkillType, React.ReactNode> = {
  listening: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path d="M9 9a3 3 0 1 1 6 0c0 2-3 3-3 6" />
      <path d="M5 9a3 3 0 0 1 6 0c0 2-3 3-3 6" />
      <path d="M3 9c0 7 3 10 9 10s9-3 9-10" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  reading: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  writing: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  speaking: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
}

const SKILL_LABELS: Record<SkillType, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
}

export function ProgressTracker({
  skills,
  currentSkill,
  onSelectSkill,
  className = '',
}: ProgressTrackerProps) {
  const getStatusColor = (status: string, isActive: boolean) => {
    if (isActive) return 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
    switch (status) {
      case 'submitted':
      case 'graded':
        return 'border-green-500 bg-green-50 text-green-700'
      case 'in_progress':
        return 'border-blue-400 bg-blue-50 text-blue-600'
      default:
        return 'border-gray-200 bg-gray-50 text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'submitted' || status === 'graded') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      )
    }
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} role="navigation" aria-label="Exam progress">
      {skills.map((skill) => {
        const isActive = skill.skill_type === currentSkill
        const isClickable = onSelectSkill && (skill.status === 'not_started' || skill.status === 'in_progress')

        return (
          <button
            key={skill.skill_type}
            onClick={() => isClickable && onSelectSkill(skill.skill_type)}
            disabled={!isClickable}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${getStatusColor(skill.status, isActive)} ${
              isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
            }`}
            aria-current={isActive ? 'step' : undefined}
          >
            {getStatusIcon(skill.status)}
            {SKILL_ICONS[skill.skill_type]}
            <span>{SKILL_LABELS[skill.skill_type]}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// ExamSession — wraps skill exam pages
// ============================================================

interface ExamSessionProps {
  attempt: ExamAttempt
  children: React.ReactNode
  onAllSubmitted?: () => void
}

export function ExamSession({ attempt, children }: ExamSessionProps) {
  const { startAttempt, exitExam, currentSkill, setCurrentSkill } = useExamAttempt()
  const navigate = useNavigate()

  useEffect(() => {
    startAttempt(attempt)
  }, [attempt, startAttempt])

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit? Your progress will be saved.')) {
      exitExam()
      navigate('/app/exams')
    }
  }

  const completedCount = attempt.skills?.filter(
    (s) => s.status === 'submitted' || s.status === 'graded'
  ).length ?? 0
  const totalCount = attempt.skills?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
              {attempt.exam_title}
            </h1>
            <span className="text-sm text-gray-500">
              {completedCount}/{totalCount} completed
            </span>
          </div>

          <div className="flex items-center gap-4">
            {attempt.skills && currentSkill && (
              <ProgressTracker
                skills={attempt.skills}
                currentSkill={currentSkill}
                onSelectSkill={setCurrentSkill}
              />
            )}
            <ExamTimer />
            <button
              onClick={handleExit}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

// ============================================================
// ExamSession wrapper with provider
// ============================================================

interface ExamSessionWithProviderProps {
  attempt: ExamAttempt
  onAllSubmitted?: () => void
  children?: React.ReactNode
}

export function ExamSessionWithProvider({ attempt, onAllSubmitted, children }: ExamSessionWithProviderProps) {
  return (
    <ExamAttemptProvider>
      <ExamSession attempt={attempt} onAllSubmitted={onAllSubmitted}>
        {children}
      </ExamSession>
    </ExamAttemptProvider>
  )
}
