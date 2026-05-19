import { ADMIN_ROLES, ROLES, ROUTES } from '@/lib/constants'

/**
 * Default landing path after tenant auth when there is no explicit ?redirect=.
 */
export function defaultPathAfterTenantAuth(role: string | undefined | null): string {
  const r = (role || '').trim()
  if (r === ROLES.SYSTEM_ADMIN) {
    return '/admin'
  }
  if (r === ROLES.TEACHER) {
    return '/admin/grading'
  }
  if (ADMIN_ROLES.includes(r as (typeof ADMIN_ROLES)[number])) {
    return '/admin'
  }
  return ROUTES.APP_DASHBOARD
}
