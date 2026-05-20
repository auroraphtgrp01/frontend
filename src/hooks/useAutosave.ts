import { useCallback, useEffect, useRef, useState } from 'react'

// ============================================================
// Types
// ============================================================

export interface AutosaveOptions<T> {
  /** Unique identifier for this session (used for localStorage key) */
  sessionId: string
  /** Current data to save */
  data: T
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number
  /** Checkpoint interval in ms (default: 30000) */
  checkpointMs?: number
  /** Whether autosave is enabled */
  enabled: boolean
  /** Called when save fails */
  onError?: (error: unknown) => void
  /** Called when save succeeds */
  onSuccess?: () => void
}

export interface AutosaveReturn {
  /** Whether a save is currently in progress */
  isSaving: boolean
  /** Manually trigger a save */
  saveNow: () => Promise<void>
  /** Timestamp of last successful save */
  lastSavedAt: Date | null
}

// ============================================================
// Deep equal helper
// ============================================================

function deepEqual(a: unknown, b: unknown): boolean {
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

// ============================================================
// Generic autosave hook factory
// ============================================================

/**
 * Creates a reusable autosave hook with debounce, checkpoint, and client-side persistence.
 *
 * @param saveFn - Async function to call for saving. Should return the sequence number used.
 * @param storageKeyPrefix - Prefix for localStorage key
 *
 * @example
 * ```ts
 * const autosave = createAutosaveHook(
 *   async (data, seq) => {
 *     await api.patch(`/trial/${sessionId}/autosave`, { answers: data, client_seq: seq })
 *     return seq
 *   },
 *   'trial_session'
 * )
 *
 * // In component:
 * const { isSaving, saveNow } = autosave({
 *   sessionId: 'abc-123',
 *   data: answers,
 *   enabled: true,
 * })
 * ```
 */
export function createAutosaveHook<T>(
  saveFn: (data: T, seq: number) => Promise<number>
) {
  return function useAutosave(options: AutosaveOptions<T>): AutosaveReturn {
    const {
      sessionId: _sessionId,
      data,
      debounceMs = 2_000,
      checkpointMs = 30_000,
      enabled,
      onError,
      onSuccess,
    } = options

    const pendingRef = useRef(false)
    const lastSeqRef = useRef(0)
    const lastSavedDataRef = useRef<T | null>(null)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const checkpointIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

    // Check if data has changed since last save
    const hasDataChanged = useCallback((): boolean => {
      if (lastSavedDataRef.current === null) return true
      return !deepEqual(data, lastSavedDataRef.current)
    }, [data])

    // Core save function
    const doSave = useCallback(async () => {
      if (!enabled) return
      if (pendingRef.current) return
      if (!hasDataChanged()) return

      pendingRef.current = true
      const nextSeq = lastSeqRef.current + 1

      try {
        const usedSeq = await saveFn(data, nextSeq)
        lastSeqRef.current = usedSeq
        lastSavedDataRef.current = data
        setLastSavedAt(new Date())
        onSuccess?.()
      } catch (err) {
        onError?.(err)
      } finally {
        pendingRef.current = false
      }
    }, [enabled, data, saveFn, hasDataChanged, onError, onSuccess])

    // Debounced autosave on data change
    useEffect(() => {
      if (!enabled) return

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      if (!hasDataChanged()) return

      debounceTimerRef.current = setTimeout(() => {
        doSave()
      }, debounceMs)

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
      }
    }, [enabled, data, debounceMs, doSave, hasDataChanged])

    // Periodic checkpoint
    useEffect(() => {
      if (!enabled) return

      checkpointIntervalRef.current = setInterval(() => {
        if (!pendingRef.current && hasDataChanged()) {
          doSave()
        }
      }, checkpointMs)

      return () => {
        if (checkpointIntervalRef.current) {
          clearInterval(checkpointIntervalRef.current)
          checkpointIntervalRef.current = null
        }
      }
    }, [enabled, checkpointMs, doSave, hasDataChanged])

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        if (checkpointIntervalRef.current) clearInterval(checkpointIntervalRef.current)
      }
    }, [])

    // Manual save function
    const saveNow = useCallback(async () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      await doSave()
    }, [doSave])

    return {
      isSaving: pendingRef.current,
      saveNow,
      lastSavedAt,
    }
  }
}

// ============================================================
// localStorage helpers
// ============================================================

export function saveToStorage<T>(sessionId: string, prefix: string, data: T): void {
  try {
    const key = `${prefix}_${sessionId}`
    localStorage.setItem(key, JSON.stringify({ data, savedAt: new Date().toISOString() }))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function loadFromStorage<T>(sessionId: string, prefix: string): T | null {
  try {
    const key = `${prefix}_${sessionId}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.data as T
  } catch {
    return null
  }
}

export function clearFromStorage(sessionId: string, prefix: string): void {
  try {
    const key = `${prefix}_${sessionId}`
    localStorage.removeItem(key)
  } catch {
    // Silently fail
  }
}
