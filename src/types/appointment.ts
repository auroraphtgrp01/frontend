// ============================================================
// Appointment & Scheduling Types
// ============================================================

// ---------- Appointment ----------

export interface Appointment {
  id: string
  user_id: string
  user_name?: string
  user_email?: string
  academy_id: string
  order_id?: string
  exam_type: ExamType
  status: AppointmentStatus
  appointment_date: string
  time_slot: string
  teacher_id?: string
  teacher_name?: string
  location?: string
  notes?: string
  reschedule_count: number
  max_reschedules: number
  created_at: string
  updated_at: string
}

export type ExamType =
  | 'listening'
  | 'reading'
  | 'writing'
  | 'speaking'
  | 'lrw'
  | 'full_test'

export type AppointmentStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'booked'
  | 'confirmed'
  | 'reschedule_requested'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface AppointmentDetail extends Appointment {
  order?: {
    id: string
    total: number
    status: string
  }
  reschedule_history?: RescheduleHistory[]
  skills?: SkillStatusInfo[]
}

export interface SkillStatusInfo {
  skill_attempt_id?: string
  skill: string
  exam_uuid?: string
  status: string
  started_at?: string
  submitted_at?: string
}

export interface RescheduleHistory {
  id: string
  previous_date: string
  previous_time_slot: string
  new_date: string
  new_time_slot: string
  requested_at: string
  approved_at?: string
  status: string
}

// ---------- Reschedule ----------

export interface RescheduleQuota {
  remaining: number
  max_allowed: number
}

export interface RescheduleRequest {
  new_date: string
  new_time_slot: string
  reason?: string
}

// ---------- Time Slot ----------

export interface TimeSlot {
  id: string
  academy_id?: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  booked: number
  teacher_id?: string
  teacher_name?: string
  available: number
  is_active?: boolean
}

export interface CreateTimeSlotBatch {
  date: string
  start_time: string
  end_time: string
  capacity: number
  teacher_id?: string
}

export interface UpdateTimeSlotRequest {
  date?: string
  start_time?: string
  end_time?: string
  capacity?: number
  teacher_id?: string
  is_active?: boolean
}

// ---------- Scheduling ----------

export interface SchedulingDay {
  id: string
  academy_id?: string
  date: string
  is_active: boolean
  slots?: TimeSlot[]
  created_at?: string
}

export interface CreateSchedulingDayRequest {
  date: string
  is_active?: boolean
}

export interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
}

export interface TimeShift {
  id: string
  shift_id: string
  date: string
  capacity: number
}

export interface SchedulingSlot {
  date: string
  slots: TimeSlot[]
  available_count: number
}

export interface CheckRegisterResponse {
  can_register: boolean
  message?: string
  available_dates?: string[]
}
