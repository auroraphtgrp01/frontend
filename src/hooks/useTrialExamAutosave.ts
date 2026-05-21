import { useCallback, useEffect, useRef, useState } from 'react'
import { useTrialAutosave } from '@/api/trialExam'

// ============================================================
// Types
// ============================================================

export interface StoredTrialSession {
  answers: Record<string, unknown>
  essayText: string
  clientSeq: number
  savedAt: string
}

export interface OfflineQueueItem {
  sessionId: string
  answers: Record<string, unknown>
  clientSeq: number
  queuedAt: string
}

// ============================================================
// Constants
// ============================================================

const AUTOSAVE_DEBOUNCE_MS = 2_000
const OFFLINE_QUEUE_KEY = 'trial_offline_queue'
const MAX_OFFLINE_QUEUE = 50

// ============================================================
// Hook
// ============================================================

export interface UseTrialExamAutosaveOptions {
  sessionId: string
  answers: Record<string, unknown>
  essayText?: string
  enabled: boolean
  isDirty: boolean // true = user changed, false = server sync (skip autosave)
  serverSeq?: number // server-side client_seq for idempotency
  onError?: (error: unknown) => void
}

export interface UseTrialExamAutosaveReturn {
  isSaving: boolean
  isOffline: boolean
  saveNow: () => Promise<void>
  lastSavedAt: Date | null
  pendingOfflineCount: number
  flushOfflineQueue: () => Promise<void>
}

export function useTrialExamAutosave(
  options: UseTrialExamAutosaveOptions
): UseTrialExamAutosaveReturn {
  const { sessionId, answers, essayText = '', enabled, isDirty, serverSeq, onError } = options
  const autosaveMutation = useTrialAutosave()

  // Refs - mutable state that persists across renders
  const pendingRef = useRef(false)
  const lastSeqRef = useRef(0)
  const lastSavedSerializedRef = useRef<string>('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerializedAnswersRef = useRef<string>('')
  
  // Track current props in refs to avoid stale closures
  const enabledRef = useRef(enabled)
  const sessionIdRef = useRef(sessionId)
  const answersRef = useRef(answers)
  const essayTextRef = useRef(essayText)
  
  enabledRef.current = enabled
  sessionIdRef.current = sessionId
  answersRef.current = answers
  essayTextRef.current = essayText

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0)

  // ---- Offline queue helpers ----
  const getOfflineQueue = useCallback((): OfflineQueueItem[] => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
      return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : []
    } catch {
      return []
    }
  }, [])

  const saveOfflineQueue = useCallback((queue: OfflineQueueItem[]) => {
    try {
      const trimmed = queue.slice(-MAX_OFFLINE_QUEUE)
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(trimmed))
      setPendingOfflineCount(trimmed.length)
    } catch {
      // Silently fail
    }
  }, [])

  const pushToOfflineQueue = useCallback((item: OfflineQueueItem) => {
    const queue = getOfflineQueue()
    const filtered = queue.filter(q => q.sessionId !== item.sessionId)
    saveOfflineQueue([...filtered, item])
  }, [getOfflineQueue, saveOfflineQueue])

  const flushOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue()
    if (queue.length === 0) return

    let successCount = 0
    for (const item of queue) {
      try {
        await autosaveMutation.mutateAsync({
          sessionId: item.sessionId,
          answers: item.answers,
          clientSeq: item.clientSeq,
        })
        successCount++
      } catch {
        break
      }
    }

    const remaining = queue.slice(successCount)
    saveOfflineQueue(remaining)
    setIsOffline(false)
  }, [getOfflineQueue, saveOfflineQueue, autosaveMutation])

  // Load offline queue count on mount
  useEffect(() => {
    const queue = getOfflineQueue()
    setPendingOfflineCount(queue.length)
  }, [getOfflineQueue])

  // ---- Reset when session changes ----
  useEffect(() => {
    lastSavedSerializedRef.current = ''
    lastSeqRef.current = serverSeq ?? 0
    pendingRef.current = false
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [sessionId, serverSeq])

  // ---- Serialize answers for comparison ----
  const serializeData = useCallback((a: Record<string, unknown>, b: string): string => {
    return JSON.stringify({ answers: a, essay: b })
  }, [])

  // ---- Core save function ----
  const doSave = useCallback(async (options?: { force?: boolean }): Promise<boolean> => {
    const isForce = options?.force === true
    console.debug('[autosave] doSave called', {
      enabled: enabledRef.current,
      force: isForce,
      sessionId: sessionIdRef.current,
      pending: pendingRef.current,
    })
    if (!isForce && !enabledRef.current) return false
    if (!sessionIdRef.current) return false
    if (pendingRef.current) return false

    const currentAnswers = answersRef.current
    const currentEssay = essayTextRef.current
    const currentSerialized = serializeData(currentAnswers, currentEssay)
    
    // Skip if no changes from last saved
    if (currentSerialized === lastSavedSerializedRef.current) {
      console.debug('[autosave] doSave skipped - no changes')
      return false
    }

    const payload: Record<string, unknown> = {
      ...currentAnswers,
      ...(currentEssay ? { essay_text: currentEssay } : {}),
    }
    console.log('[autosave] doSave payload keys:', Object.keys(payload).filter(k => k.startsWith('q-')).join(', '))

    if (Object.keys(payload).length === 0) {
      console.debug('[autosave] doSave skipped - empty payload')
      return false
    }

    pendingRef.current = true
    const nextSeq = lastSeqRef.current + 1
    console.debug('[autosave] saving seq', nextSeq, 'with keys:', Object.keys(payload).join(', '))

    try {
      await autosaveMutation.mutateAsync({
        sessionId: sessionIdRef.current,
        answers: payload,
        clientSeq: nextSeq,
      })
      console.debug('[autosave] save SUCCESS')
      lastSeqRef.current = nextSeq
      lastSavedSerializedRef.current = currentSerialized
      setLastSavedAt(new Date())
      setIsOffline(false)
      return true
    } catch (err) {
      console.error('[autosave] save FAILED:', err)
      pushToOfflineQueue({
        sessionId: sessionIdRef.current,
        answers: payload,
        clientSeq: nextSeq,
        queuedAt: new Date().toISOString(),
      })
      setIsOffline(true)
      onError?.(err)
      return false
    } finally {
      pendingRef.current = false
    }
  }, [autosaveMutation, pushToOfflineQueue, onError, serializeData])

  // ---- Debounced autosave ----
  useEffect(() => {
    if (!enabled) {
      console.debug('[autosave] disabled')
      return
    }

    // Skip if not dirty (server sync, not user change)
    if (!isDirty) {
      console.debug('[autosave] skipped - not dirty (server sync)')
      return
    }

    const currentSerialized = JSON.stringify({ answers, essay: essayText })
    const hasChanged = currentSerialized !== lastSerializedAnswersRef.current
    console.log('[autosave] debounce check - isDirty:', isDirty, 'hasChanged:', hasChanged, 'q-20:', answers['q-20'], 'q-21:', answers['q-21'])
    
    lastSerializedAnswersRef.current = currentSerialized

    if (!hasChanged && debounceTimerRef.current) {
      console.debug('[autosave] no change, keeping existing timer')
      return
    }

    console.debug('[autosave] scheduling debounce', {
      sessionId,
      hasAnswers: Object.keys(answers).length > 0,
      essayLength: essayText.length,
      isDirty,
    })

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Schedule new save
    debounceTimerRef.current = setTimeout(() => {
      console.debug('[autosave] debounce executed, calling doSave')
      doSave()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [enabled, answers, essayText, doSave])

  // ---- Online/offline detection ----
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      flushOfflineQueue()
    }
    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushOfflineQueue])

  // ---- Manual save ----
  const saveNow = useCallback(async (options?: { force?: boolean }): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    await doSave(options)
  }, [doSave])

  return {
    isSaving: autosaveMutation.isPending || pendingRef.current,
    isOffline,
    saveNow,
    lastSavedAt,
    pendingOfflineCount,
    flushOfflineQueue,
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
  data: { answers: Record<string, unknown>; essayText: string; clientSeq?: number }
): void {
  try {
    const stored: StoredTrialSession = {
      answers: data.answers,
      essayText: data.essayText,
      clientSeq: data.clientSeq ?? 0,
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
