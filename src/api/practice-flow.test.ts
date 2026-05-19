import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  clearPracticeStartIdempotencyKey,
  getPracticeStartIdempotencyKey,
} from '@/api/entitlements'
import {
  attemptBasePath,
  createAttemptMutationKey,
  practiceAnswersFromCheckpoint,
} from '@/api/attempts'

describe('practice flow API helpers', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps UUID order IDs in stable practice start idempotency keys', () => {
    const orderId = '4fd698ce-4e88-40bf-8dd0-ccdf4ce12260'
    const randomUUID = vi.fn(() => '71a65774-71a0-4d54-89bb-df89ab63748d')
    vi.stubGlobal('crypto', { randomUUID })

    const first = getPracticeStartIdempotencyKey(orderId, 'reading')
    const retry = getPracticeStartIdempotencyKey(orderId, 'reading')

    expect(first).toBe(
      'practice-start:4fd698ce-4e88-40bf-8dd0-ccdf4ce12260:reading:71a65774-71a0-4d54-89bb-df89ab63748d',
    )
    expect(retry).toBe(first)
    expect(randomUUID).toHaveBeenCalledTimes(1)

    clearPracticeStartIdempotencyKey(orderId, 'reading')
    expect(sessionStorage.getItem(`imto.practice.start:${orderId}:reading`)).toBeNull()
  })

  it('uses practice attempt endpoints and deterministic autosave/submit keys', () => {
    const attemptId = '8c617aa2-ce3d-490e-bb93-cb07ff70dc43'
    const skillAttemptId = '6df6d99e-bf92-4f08-81f9-50c6147f5c60'
    const dirty = [
      { question_id: 'q-1', client_answer_seq: 2, answer: 'A' },
      { question_id: 'q-2', client_answer_seq: 5, answer: ['B', 'C'] },
    ]

    expect(attemptBasePath('practice')).toBe('/api/v1/practice/attempts')
    expect(createAttemptMutationKey('autosave', attemptId, skillAttemptId, dirty)).toBe(
      createAttemptMutationKey('autosave', attemptId, skillAttemptId, dirty),
    )
    expect(createAttemptMutationKey('submit', attemptId, skillAttemptId, dirty)).not.toBe(
      createAttemptMutationKey('autosave', attemptId, skillAttemptId, dirty),
    )
    expect(
      createAttemptMutationKey('autosave', attemptId, skillAttemptId, [
        { ...dirty[0], client_answer_seq: 3 },
      ]),
    ).not.toBe(createAttemptMutationKey('autosave', attemptId, skillAttemptId, dirty))
  })

  it('preserves monotonic client_answer_seq values for practice payloads', () => {
    const payload = practiceAnswersFromCheckpoint([
      { question_id: 'q-1', answer: 'A', client_answer_seq: 7, updated_at: '2026-05-16T00:00:00Z' },
      { question_id: 'q-2', answer: ['B', 'C'], updated_at: '2026-05-16T00:00:01Z' },
    ])

    expect(payload).toEqual([
      { question_id: 'q-1', value: 'A', client_answer_seq: 7 },
      { question_id: 'q-2', value: '["B","C"]', client_answer_seq: 2 },
    ])
  })
})
