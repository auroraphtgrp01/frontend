/**
 * Pre-filled login fields in Vite dev only (production build → empty).
 * Override with VITE_DEV_* in .env; defaults match identity-service .env.example
 * (ACADEMY_BOOTSTRAP_* admin / teacher / user).
 */
export type DevLoginPreset = {
  id: string
  label: string
  email: string
  password: string
}

/** Dev-only presets for quick switching on the academy login form (empty in prod builds). */
export function academyLoginPresets(): DevLoginPreset[] {
  if (!import.meta.env.DEV) return []
  const env = import.meta.env
  return [
    {
      id: 'center-a-user',
      label: 'Center A — Học viên',
      email: env.VITE_DEV_ACADEMY_USER_EMAIL || 'user@center-a.local',
      password: env.VITE_DEV_ACADEMY_USER_PASSWORD || 'AcademyUser123!',
    },
    {
      id: 'center-a-admin',
      label: 'Center A — Quản trị (Admin)',
      email: env.VITE_DEV_ACADEMY_LOGIN_EMAIL || 'admin@center-a.local',
      password: env.VITE_DEV_ACADEMY_LOGIN_PASSWORD || 'AcademyAdmin123!',
    },
    {
      id: 'center-a-teacher',
      label: 'Center A — Giáo viên',
      email: env.VITE_DEV_ACADEMY_TEACHER_EMAIL || 'teacher@center-a.local',
      password: env.VITE_DEV_ACADEMY_TEACHER_PASSWORD || 'AcademyTeacher123!',
    },
  ]
}

export function academyLoginDefaultValues(): { email: string; password: string } {
  if (!import.meta.env.DEV) {
    return { email: '', password: '' }
  }
  const presets = academyLoginPresets()
  if (presets.length > 0) {
    return { email: presets[0].email, password: presets[0].password }
  }
  return { email: '', password: '' }
}

export function superAdminLoginDefaultValues(): { email: string; password: string } {
  if (!import.meta.env.DEV) {
    return { email: '', password: '' }
  }
  return {
    email: import.meta.env.VITE_DEV_SYSTEM_ADMIN_LOGIN_EMAIL || 'superadmin@global.local',
    password: import.meta.env.VITE_DEV_SYSTEM_ADMIN_LOGIN_PASSWORD || 'SuperAdmin123!',
  }
}
