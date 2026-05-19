import type { Appointment, AppointmentDetail, AppointmentStatus, ExamType, SkillStatusInfo } from '@/types/appointment'

export type ApiAppointment = {
  id?: string | number
  selected_date?: string | null
  selected_date_from?: string | null
  selected_date_to?: string | null
  type_slot?: string | null
  status?: string | null
  teacher_confirm?: string | null
  linkmeet?: string | null
  order_id?: string | number | null
  user_id?: string | number | null
  created_at?: string
  updated_at?: string
  skills?: ApiSkillStatus[]
}

export type ApiSkillStatus = {
  skill_attempt_id?: string
  skill?: string
  exam_uuid?: string
  status?: string
  started_at?: string
  submitted_at?: string
}

const UPCOMING_STATUSES = new Set<AppointmentStatus>([
  'awaiting_payment',
  'booked',
  'confirmed',
  'pending',
  'reschedule_requested',
  'in_progress',
])

export function mapAppointmentStatus(status?: string | null): AppointmentStatus {
  switch ((status || '').toLowerCase()) {
    case 'awaiting_payment':
      return 'awaiting_payment'
    case 'pending':
      return 'pending'
    case 'confirmed':
      return 'confirmed'
    case 'completed':
      return 'completed'
    case 'rejected':
    case 'cancelled':
      return 'cancelled'
    case 'reschedule_requested':
      return 'reschedule_requested'
    case 'in_progress':
      return 'in_progress'
    default:
      return 'booked'
  }
}

export function mapTypeSlotToExamType(typeSlot?: string | null): ExamType {
  switch ((typeSlot || '').toLowerCase()) {
    case 'speaking':
      return 'speaking'
    case 'lrw':
      return 'lrw'
    case 'package':
      return 'full_test'
    case 'listening':
    case 'reading':
    case 'writing':
      return typeSlot as ExamType
    default:
      return 'lrw'
  }
}

function formatTimeLabel(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function resolveAppointmentDate(api: ApiAppointment): string {
  if (api.selected_date) {
    return api.selected_date.slice(0, 10)
  }
  if (api.selected_date_from) {
    return api.selected_date_from.slice(0, 10)
  }
  return ''
}

export function resolveAppointmentTimeSlot(api: ApiAppointment): string {
  if (api.selected_date_from && api.selected_date_to) {
    return `${formatTimeLabel(api.selected_date_from)}-${formatTimeLabel(api.selected_date_to)}`
  }
  if (api.selected_date_from) {
    return formatTimeLabel(api.selected_date_from)
  }
  return '—'
}

export function mapApiAppointment(api: ApiAppointment): Appointment {
  const appointmentDate = resolveAppointmentDate(api)
  return {
    id: String(api.id ?? ''),
    user_id: String(api.user_id ?? ''),
    academy_id: '',
    order_id: api.order_id != null ? String(api.order_id) : undefined,
    exam_type: mapTypeSlotToExamType(api.type_slot),
    status: mapAppointmentStatus(api.status),
    appointment_date: appointmentDate,
    time_slot: resolveAppointmentTimeSlot(api),
    reschedule_count: 0,
    max_reschedules: 0,
    created_at: api.created_at ?? new Date().toISOString(),
    updated_at: api.updated_at ?? api.created_at ?? new Date().toISOString(),
  }
}

export function mapApiAppointmentDetail(api: ApiAppointment): AppointmentDetail {
  const base = mapApiAppointment(api)
  const skills: SkillStatusInfo[] = (api.skills ?? []).map((s) => ({
    skill: s.skill ?? '',
    skill_attempt_id: s.skill_attempt_id,
    exam_uuid: s.exam_uuid,
    status: s.status ?? 'not_started',
    started_at: s.started_at,
    submitted_at: s.submitted_at,
  }))
  return {
    ...base,
    skills,
  }
}

export function isUpcomingAppointmentStatus(status: AppointmentStatus): boolean {
  return UPCOMING_STATUSES.has(status)
}

export function appointmentExamTypeLabel(examType: ExamType): string {
  switch (examType) {
    case 'listening':
      return 'Listening'
    case 'reading':
      return 'Reading'
    case 'writing':
      return 'Writing'
    case 'speaking':
      return 'Speaking'
    case 'lrw':
      return 'L-R-W'
    case 'full_test':
      return 'Full test'
    default:
      return examType
  }
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Awaiting payment'
    case 'pending':
      return 'Pending'
    case 'booked':
      return 'Booked'
    case 'confirmed':
      return 'Confirmed'
    case 'reschedule_requested':
      return 'Reschedule requested'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}
