import { ROLES } from '@/lib/constants'

/** Product experience derived from JWT `role` (matches claim strings). */
export type AppFlow = 'system_admin' | 'academy_admin' | 'teacher' | 'learner'

export function getAppFlow(role: string | undefined | null): AppFlow {
  const r = (role || '').trim()
  if (r === ROLES.SYSTEM_ADMIN) return 'system_admin'
  if (r === ROLES.ACADEMY_ADMIN) return 'academy_admin'
  if (r === ROLES.TEACHER) return 'teacher'
  return 'learner'
}

/** User-visible mode line (Vietnamese + English role id where useful) */
export const FLOW_LABELS_VI: Record<AppFlow, string> = {
  system_admin: 'System admin — quản trị toàn hệ thống',
  academy_admin: 'Academy admin — quản trị một trung tâm',
  teacher: 'Teacher — chấm điểm & lớp học',
  learner: 'Học viên',
}

/** Shell accent for quick visual separation */
export type ShellVariant = 'learner' | 'platform' | 'academy_staff' | 'teacher'

export function shellVariantForFlow(flow: AppFlow): ShellVariant {
  switch (flow) {
    case 'system_admin':
      return 'platform'
    case 'teacher':
      return 'teacher'
    case 'academy_admin':
      return 'academy_staff'
    default:
      return 'learner'
  }
}
