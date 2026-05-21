import { describe, expect, it } from 'vitest'
import { hasHalfOpenSlotOverlap } from './retail-registration'
import type { SlotAvailability } from '@/types/booking'

const slot = (start: string, end: string): SlotAvailability => ({
  slot_id: `${start}-${end}`,
  teacher_id: '',
  teacher_name: '',
  start_time: start,
  end_time: end,
  available: true,
})

describe('hasHalfOpenSlotOverlap', () => {
  it('returns true when windows overlap', () => {
    const left = slot('2026-05-20T13:00:00Z', '2026-05-20T16:00:00Z')
    const right = slot('2026-05-20T15:00:00Z', '2026-05-20T16:00:00Z')
    expect(hasHalfOpenSlotOverlap(left, right)).toBe(true)
  })

  it('returns false for back-to-back windows', () => {
    const left = slot('2026-05-20T13:00:00Z', '2026-05-20T16:00:00Z')
    const right = slot('2026-05-20T16:00:00Z', '2026-05-20T17:00:00Z')
    expect(hasHalfOpenSlotOverlap(left, right)).toBe(false)
  })
})
