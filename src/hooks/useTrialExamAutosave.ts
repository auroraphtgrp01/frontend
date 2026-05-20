import { useCallback, useEffect, useRef, useState } from 'react'
import { useTrialAutosave } from '@/api/trialExam'

// ============================================================
// Types
// ============================================================

export interface StoredTrialSession {
  answers: Record<string, unknown>
  essayText: string
  savedAt: string
}

// ============================================================
// Constants
// ============================================================

const AUTOSAVE_DEBOUNCE_MS = 2_000
const CHECKPOINT_INTERVAL_MS = 30_000

// ============================================================
// Hook
// ============================================================

export interface UseTrialExamAutosaveOptions {
  sessionId: string
  answers: Record<string, unknown>
  essayText?: string
  enabled: boolean
  onError?: (error: unknown) => void
}

export interface UseTrialExamAutosaveReturn {
  isSaving: boolean
  saveNow: () => Promise<void>
  lastSavedAt: Date | null
}

export function useTrialExamAutosave(
  options: UseTrialExamAutosaveOptions
): UseTrialExamAutosaveReturn {
  const { sessionId, answers, essayText = '', enabled, onError } = options
  const autosaveMutation = useTrialAutosave()

  // All mutable state stored in REFS to avoid stale closures and re-render issues
  const enabledRef = useRef(enabled)
  const sessionIdRef = useRef(sessionId)
  const answersRef = useRef(answers)
  const essayTextRef = useRef(essayText)

  // Update refs when props change
  enabledRef.current = enabled
  sessionIdRef.current = sessionId
  answersRef.current = answers
  essayTextRef.current = essayText

  const pendingRef = useRef(false)
  const lastSeqRef = useRef(0)
  const lastSavedAnswersRef = useRef<Record<string, unknown>>({})
  const lastSavedEssayRef = useRef('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkpointIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Deep equal check for objects
  const deepEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (a === null || b === null) return a === b
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, i) => deepEqual(item, b[i]))
    }
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a as object)
      const keysB = Object.keys(b as object)
      if (keysA.length !== keysB.length) return false
      return keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
    }
    return false
  }

  // Check if answers have changed since last save
  const hasAnswersChanged = (): boolean => {
    const answersChanged = !deepEqual(answersRef.current, lastSavedAnswersRef.current)
    const essayChanged = essayTextRef.current !== lastSavedEssayRef.current
    return answersChanged || essayChanged
  }

  // Build the full payload for autosave
  const buildPayload = (): Record<string, unknown> => {
    const text = essayTextRef.current
    return {
      ...answersRef.current,
      ...(text ? { essay_text: text } : {}),
    }
  }

  // Core save function - reads from refs only
  const doSave = useCallback(async (): Promise<void> => {
    if (!enabledRef.current) return
    if (!sessionIdRef.current) return
    if (pendingRef.current) return
    if (!hasAnswersChanged()) return

    const payload = buildPayload()
    if (Object.keys(payload).length === 0) return

    pendingRef.current = true
    const nextSeq = lastSeqRef.current + 1

    try {
      await autosaveMutation.mutateAsync({
        sessionId: sessionIdRef.current,
        answers: payload,
        clientSeq: nextSeq,
      })
      lastSeqRef.current = nextSeq
      lastSavedAnswersRef.current = { ...answersRef.current }
      lastSavedEssayRef.current = essayTextRef.current
      setLastSavedAt(new Date())
    } catch (err) {
      onError?.(err)
    } finally {
      pendingRef.current = false
    }
  }, []) // No deps - always reads from refs

  // ---- Debounced autosave: chỉ trigger khi có thay đổi thực sự ----
  useEffect(() => {
    // Cancel pending timer khi answers/essay thay đổi
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Skip nếu không enabled hoặc không có thay đổi
    if (!enabledRef.current) return
    if (!hasAnswersChanged()) return

    debounceTimerRef.current = setTimeout(() => {
      doSave()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [answers, essayText, doSave])

  // ---- Periodic checkpoint: độc lập với debounce ----
  useEffect(() => {
    if (!enabledRef.current) return

    const interval = setInterval(() => {
      if (!pendingRef.current && hasAnswersChanged()) {
        doSave()
      }
    }, CHECKPOINT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [doSave])

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (checkpointIntervalRef.current) clearInterval(checkpointIntervalRef.current)
    }
  }, [])

  // ---- Manual save: force save immediately, cancel pending debounce ----
  const saveNow = useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    await doSave()
  }, [doSave])

  return {
    isSaving: autosaveMutation.isPending || pendingRef.current,
    saveNow,
    lastSavedAt,
  }
}

// ============================================================
// localStorage helpers
// ============================================================

export function getTrialSessionStorageKey(sessionId: string): string {
  return `trial_session_${sessionId}`
}

export function saveTrialSessionToStorage(
  sessionId: string,
  data: { answers: Record<string, unknown>; essayText: string }
): void {
  try {
    const stored: StoredTrialSession = {
      answers: data.answers,
      essayText: data.essayText,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(getTrialSessionStorageKey(sessionId), JSON.stringify(stored))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function loadTrialSessionFromStorage(
  sessionId: string
): StoredTrialSession | null {
  try {
    const raw = localStorage.getItem(getTrialSessionStorageKey(sessionId))
    if (!raw) return null
    return JSON.parse(raw) as StoredTrialSession
  } catch {
    return null
  }
}

export function clearTrialSessionFromStorage(sessionId: string): void {
  try {
    localStorage.removeItem(getTrialSessionStorageKey(sessionId))
  } catch {
    // Silently fail
  }
}
