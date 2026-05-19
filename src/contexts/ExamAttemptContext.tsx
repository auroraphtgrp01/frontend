import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { useAutoSave } from '@/api/attempts'
import type {
  ExamAttempt,
  CheckpointAnswer,
  SkillType,
} from '@/types/exam'
import { AUTO_SAVE_DEBOUNCE_MS, EXAM_CHECKPOINT_INTERVAL_MS } from '@/lib/constants'

// ============================================================
// Types
// ============================================================

interface ExamAttemptState {
  attempt: ExamAttempt | null
  currentSkill: SkillType | null
  answers: Record<string, CheckpointAnswer[]>
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: string | null
}

interface ExamAttemptActions {
  startAttempt: (attempt: ExamAttempt) => void
  setCurrentSkill: (skill: SkillType) => void
  updateAnswer: (questionId: string, answer: string | string[] | null, skill?: SkillType) => void
  saveNow: () => Promise<void>
  submitSkill: (skillAttemptId: string) => Promise<void>
  exitExam: () => void
  resumeAttempt: (attempt: ExamAttempt) => void
}

interface ExamAttemptContextValue extends ExamAttemptState, ExamAttemptActions {
  timeRemaining: number
  setTimeRemaining: (t: number) => void
  isTimerWarning: boolean
  isTimerCritical: boolean
}

// ============================================================
// Storage Keys
// ============================================================

const EXAM_STORAGE_KEY = 'imto_exam_session'

interface StoredSession {
  attemptId: string
  currentSkill: SkillType
  answers: Record<string, CheckpointAnswer[]>
  expiresAt: string
  startedAt: string
}

// ============================================================
// Context
// ============================================================

const ExamAttemptContext = createContext<ExamAttemptContextValue | null>(null)

export const useExamAttempt = () => {
  const ctx = useContext(ExamAttemptContext)
  if (!ctx) {
    throw new Error('useExamAttempt must be used within ExamAttemptProvider')
  }
  return ctx
}

// ============================================================
// Provider
// ============================================================

interface ExamAttemptProviderProps {
  children: ReactNode
}

export const ExamAttemptProvider: React.FC<ExamAttemptProviderProps> = ({ children }) => {
  const [state, setState] = useState<ExamAttemptState>({
    attempt: null,
    currentSkill: null,
    answers: {},
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
  })

  const [timeRemaining, setTimeRemaining] = useState(0)
  const autoSaveMutation = useAutoSave()
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dirtyRef = useRef(false)

  // ---- Derived timer states ----
  const isTimerWarning = useMemo(() => timeRemaining > 0 && timeRemaining <= 5 * 60, [timeRemaining])
  const isTimerCritical = useMemo(() => timeRemaining > 0 && timeRemaining <= 60, [timeRemaining])

  // ---- Persist session to localStorage ----
  const persistSession = useCallback((attemptId: string, skill: SkillType, answers: Record<string, CheckpointAnswer[]>, expiresAt: string, startedAt: string) => {
    const session: StoredSession = { attemptId, currentSkill: skill, answers, expiresAt, startedAt }
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(session))
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(EXAM_STORAGE_KEY)
  }, [])

  // ---- Restore session from localStorage ----
  const restoreSession = useCallback((): StoredSession | null => {
    try {
      const raw = localStorage.getItem(EXAM_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StoredSession
    } catch {
      return null
    }
  }, [])

  // ---- Timer countdown ----
  useEffect(() => {
    if (!state.attempt || timeRemaining <= 0) return

    const tick = () => {
      setTimeRemaining((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }

    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [state.attempt, timeRemaining > 0])

  // ---- Auto-save: debounced on answer change ----
  useEffect(() => {
    if (!state.isDirty || !state.attempt || !state.currentSkill) return

    const skillAttempt = state.attempt.skills?.find((s) => s.skill_type === state.currentSkill)
    if (!skillAttempt) return

    const handler = setTimeout(async () => {
      const answers = state.answers[state.currentSkill!] || []
      if (answers.length === 0) return

      setState((s) => ({ ...s, isSaving: true }))
      try {
        await autoSaveMutation.mutateAsync({
          attemptId: state.attempt!.id,
          skillAttemptId: skillAttempt.id,
          answers,
          runtime: state.attempt!.runtime,
        })
        setState((s) => ({
          ...s,
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date().toISOString(),
        }))
      } catch {
        setState((s) => ({ ...s, isSaving: false }))
      }
    }, AUTO_SAVE_DEBOUNCE_MS)

    return () => clearTimeout(handler)
  }, [state.answers, state.isDirty, state.attempt, state.currentSkill, autoSaveMutation])

  // ---- Periodic checkpoint every 30s ----
  useEffect(() => {
    if (!state.attempt || !state.currentSkill || timeRemaining <= 0) return

    const skillAttempt = state.attempt.skills?.find((s) => s.skill_type === state.currentSkill)
    if (!skillAttempt) return

    saveTimerRef.current = setInterval(async () => {
      const answers = state.answers[state.currentSkill!] || []
      if (answers.length === 0) return

      setState((s) => ({ ...s, isSaving: true }))
      try {
        await autoSaveMutation.mutateAsync({
          attemptId: state.attempt!.id,
          skillAttemptId: skillAttempt.id,
          answers,
          runtime: state.attempt!.runtime,
        })
        setState((s) => ({
          ...s,
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date().toISOString(),
        }))
      } catch {
        setState((s) => ({ ...s, isSaving: false }))
      }
    }, EXAM_CHECKPOINT_INTERVAL_MS)

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current)
    }
  }, [state.attempt, state.currentSkill, state.answers, timeRemaining, autoSaveMutation])

  // ---- Beforeunload guard ----
  useEffect(() => {
    if (!state.attempt) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault()
        e.returnValue = 'You have unsaved answers. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.attempt, state.isDirty])

  // ---- Actions ----

  const startAttempt = useCallback((attempt: ExamAttempt) => {
    const now = Date.now()
    const expiresMs = attempt.expires_at
      ? new Date(attempt.expires_at).getTime() - now
      : 0
    const remaining = Math.max(0, Math.floor(expiresMs / 1000))

    setState({
      attempt,
      currentSkill: null,
      answers: {},
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
    })
    setTimeRemaining(remaining)

    if (attempt.expires_at) {
      persistSession(attempt.id, 'listening', {}, attempt.expires_at, attempt.started_at)
    }
  }, [persistSession])

  const resumeAttempt = useCallback((attempt: ExamAttempt) => {
    const session = restoreSession()
    if (!session || session.attemptId !== attempt.id) return

    const now = Date.now()
    const expiresMs = new Date(session.expiresAt).getTime() - now
    const remaining = Math.max(0, Math.floor(expiresMs / 1000))

    setState({
      attempt,
      currentSkill: session.currentSkill,
      answers: session.answers,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
    })
    setTimeRemaining(remaining)
  }, [restoreSession])

  const setCurrentSkill = useCallback((skill: SkillType) => {
    setState((s) => {
      if (!s.attempt?.expires_at) return { ...s, currentSkill: skill }

      const skillAttempt = s.attempt.skills?.find((sk) => sk.skill_type === skill)
      let remaining = 0
      if (skillAttempt?.expires_at) {
        remaining = Math.max(0, Math.floor((new Date(skillAttempt.expires_at).getTime() - Date.now()) / 1000))
      }

      persistSession(s.attempt.id, skill, s.answers, s.attempt.expires_at, s.attempt.started_at)

      // Push per-skill time to React state so timer resets
      setTimeRemaining(remaining > 0 ? remaining : Math.floor((new Date(s.attempt.expires_at).getTime() - Date.now()) / 1000))

      return { ...s, currentSkill: skill }
    })
  }, [persistSession])

  const updateAnswer = useCallback(
    (questionId: string, answer: string | string[] | null, skillOverride?: SkillType) => {
      setState((s) => {
        const skill = skillOverride ?? s.currentSkill
        if (!skill) return s
        const currentAnswers = s.answers[skill] || []
        const existing = currentAnswers.findIndex((a) => a.question_id === questionId)
        const previousSeq =
          (existing >= 0 ? currentAnswers[existing].client_answer_seq : undefined) ??
          s.attempt?.answers?.[questionId]?.client_answer_seq ??
          0

        const newAnswer: CheckpointAnswer = {
          question_id: questionId,
          client_answer_seq: previousSeq + 1,
          answer,
          updated_at: new Date().toISOString(),
        }

        const updatedAnswers: CheckpointAnswer[] =
          existing >= 0
            ? currentAnswers.map((a, i) => (i === existing ? newAnswer : a))
            : [...currentAnswers, newAnswer]

        dirtyRef.current = true
        return {
          ...s,
          answers: { ...s.answers, [skill]: updatedAnswers },
          isDirty: true,
        }
      })
    },
    [],
  )

  const saveNow = useCallback(async () => {
    if (!state.attempt || !state.currentSkill) return
    const skillAttempt = state.attempt.skills?.find((s) => s.skill_type === state.currentSkill)
    if (!skillAttempt) return

    const answers = state.answers[state.currentSkill] || []
    if (answers.length === 0) return

    setState((s) => ({ ...s, isSaving: true }))
    try {
      await autoSaveMutation.mutateAsync({
        attemptId: state.attempt.id,
        skillAttemptId: skillAttempt.id,
        answers,
        runtime: state.attempt.runtime,
      })
      setState((s) => ({
        ...s,
        isDirty: false,
        isSaving: false,
        lastSavedAt: new Date().toISOString(),
      }))
      dirtyRef.current = false
    } catch {
      setState((s) => ({ ...s, isSaving: false }))
    }
  }, [state.attempt, state.currentSkill, state.answers, autoSaveMutation])

  const submitSkill = useCallback(
    async () => {
      if (!state.attempt || !state.currentSkill) return
      await saveNow()
      clearSession()
      setState((s) => ({
        ...s,
        answers: { ...s.answers, [s.currentSkill!]: [] },
      }))
    },
    [state.attempt, state.currentSkill, saveNow, clearSession],
  )

  const exitExam = useCallback(() => {
    if (saveTimerRef.current) clearInterval(saveTimerRef.current)
    clearSession()
    setState({
      attempt: null,
      currentSkill: null,
      answers: {},
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
    })
    setTimeRemaining(0)
  }, [clearSession])

  const value = useMemo<ExamAttemptContextValue>(
    () => ({
      ...state,
      timeRemaining,
      setTimeRemaining,
      isTimerWarning,
      isTimerCritical,
      startAttempt,
      setCurrentSkill,
      updateAnswer,
      saveNow,
      submitSkill,
      exitExam,
      resumeAttempt,
    }),
    [state, timeRemaining, isTimerWarning, isTimerCritical, startAttempt, setCurrentSkill, updateAnswer, saveNow, submitSkill, exitExam, resumeAttempt],
  )

  return <ExamAttemptContext.Provider value={value}>{children}</ExamAttemptContext.Provider>
}
