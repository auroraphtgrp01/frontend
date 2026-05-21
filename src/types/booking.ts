// ============================================================
// Exam Booking Types
// ============================================================

// ---------- Booking Request ----------

export interface BookLRWRequest {
  order_id: number
  selected_date: string
  time_slot: string
  teacher_id?: number
}

export interface BookSpeakingRequest {
  order_id: number
  selected_date: string
  time_slot: string
  teacher_id?: number
}

export interface BookPackageRequest {
  order_id: number
  lrw_date: string
  lrw_time_slot: string
  speaking_date: string
  speaking_time_slot: string
  teacher_id?: number
}

// ---------- Booking Response ----------

export interface BookingAppointment {
  id: string
  type: 'lrw' | 'speaking'
  date: string
  time_slot: string
  teacher_id?: string
  teacher_name?: string
  status: BookingAppointmentStatus
  created_at: string
}

export type BookingAppointmentStatus = 'confirmed' | 'pending' | 'cancelled'

export interface BookingResponse {
  booking_id: string
  order_id: string
  appointments: BookingAppointment[]
  status: BookingStatus
  created_at: string
}

export type BookingStatus = 'confirmed' | 'pending' | 'failed'

// ---------- Slot Availability ----------

export interface SlotAvailability {
  slot_id: string
  teacher_id: string
  teacher_name: string
  teacher_avatar?: string
  start_time: string
  end_time: string
  time_slot?: string
  shift_slot?: string
  available: boolean
  capacity_remaining?: number
  blocked_reason?: string
  conflicts?: SlotConflictWindow[]
}

export interface SlotConflictWindow {
  start_time: string
  end_time: string
  source: string
  skill?: string
  reason?: string
  academy_id?: string
}

export interface SlotAvailabilityEnvelope {
  slots: SlotAvailability[]
  blocked_windows?: SlotConflictWindow[]
}

export interface AvailableDate {
  date: string
  has_slots: boolean
  slot_count: number
}

// ---------- Booking State ----------

export type BookingMode = 'lrw' | 'speaking' | 'package'

export interface BookingWizardState {
  mode: BookingMode
  orderId?: string
  currentStep: number
  // LRW Selection
  lrwDate?: string
  lrwTimeSlot?: string
  lrwTeacherId?: string
  // Speaking Selection
  speakingDate?: string
  speakingTimeSlot?: string
  speakingTeacherId?: string
  // Result
  bookingResult?: BookingResponse
}

// ---------- Booking Steps ----------

export interface BookingStep {
  id: number
  label: string
}

export const BOOKING_STEPS: Record<BookingMode, BookingStep[]> = {
  lrw: [
    { id: 1, label: 'Select Date' },
    { id: 2, label: 'Select Time Slot' },
    { id: 3, label: 'Review & Confirm' },
  ],
  speaking: [
    { id: 1, label: 'Select Date' },
    { id: 2, label: 'Select Time Slot' },
    { id: 3, label: 'Review & Confirm' },
  ],
  package: [
    { id: 1, label: 'LRW Date & Slot' },
    { id: 2, label: 'Speaking Date & Slot' },
    { id: 3, label: 'Review & Confirm' },
  ],
}
