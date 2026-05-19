// ============================================================
// Scheduling Types (Additional)
// ============================================================

// ---------- Time Slot ----------

export interface TimeSlot {
  id: string
  academy_id?: string
  date?: string
  time_slot?: string
  start_time?: string
  end_time?: string
  capacity?: number
  booked?: number
  teacher_id?: string
  teacher_name?: string
  available?: number
  is_active?: boolean
  feedback?: string
  type?: string
  shift_slot?: string
  created_at?: string
  updated_at?: string
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

// ---------- Scheduling Day ----------

export interface SchedulingDay {
  id: string
  academy_id?: string
  date: string
  is_active: boolean
  slots?: TimeSlot[]
  created_at?: string
  updated_at?: string
}

export interface CreateSchedulingDayRequest {
  date: string
  is_active?: boolean
}

// ---------- Shift ----------

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

// ---------- Scheduling Slot ----------

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

// ---------- Time Slot Query Params ----------

export interface TimeSlotFilters {
  date?: string
  start_date?: string
  end_date?: string
  teacher_id?: string
  is_active?: boolean
  page?: number
  limit?: number
}
