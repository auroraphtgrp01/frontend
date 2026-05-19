// ============================================================
// Constants
// ============================================================

// ---------- Auth ----------

export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  /** Academy UUID from access-token claims; used for tenant-scoped service headers */
  TOKEN_ACADEMY_ID: 'token_academy_id',
  /** Slug from access-token claims; required for API calls when Host is plain localhost */
  TOKEN_ACADEMY_SLUG: 'token_academy_slug',
  SELECTED_ACADEMY_ID: 'selected_academy_id',
  SELECTED_ACADEMY_NAME: 'selected_academy_name',
  TWOFA_TOKEN: 'twofa_token',
} as const

export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before actual expiry

// ---------- Roles (identity JWT `role` claim; snake_case only) ----------

export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  ACADEMY_ADMIN: 'academy_admin',
  TEACHER: 'teacher',
  USER: 'user',
} as const

export const ROLE_LABELS: Record<string, string> = {
  system_admin: 'System admin',
  academy_admin: 'Academy admin',
  teacher: 'Teacher',
  user: 'User',
}

export const ROLE_COLORS: Record<string, string> = {
  system_admin: 'destructive', // red
  academy_admin: 'default', // blue
  teacher: 'success', // green
  user: 'outline', // gray
}

// Admin roles that can manage the platform / tenant ops UI
export const ADMIN_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.ACADEMY_ADMIN]

// Grading-capable roles
/** Grading queue access (academy ops — not platform system_admin). */
export const GRADING_ROLES = [ROLES.ACADEMY_ADMIN, ROLES.TEACHER]

// ---------- Routes ----------

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  TWOFA_SETUP: '/auth/2fa/setup',
  TWOFA_VERIFY: '/auth/2fa/verify',

  // SuperAdmin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_TENANTS: '/admin/tenants',
  ADMIN_TENANT_NEW: '/admin/tenants/new',
  ADMIN_TENANT_EDIT: '/admin/tenants/:id/edit',
  ADMIN_TENANT_DETAIL: '/admin/tenants/:id',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_NEW: '/admin/users/new',
  ADMIN_USER_EDIT: '/admin/users/:id/edit',
  ADMIN_USER_DETAIL: '/admin/users/:id',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_EXAMS: '/admin/exams',
  ADMIN_EXAM_MIGRATIONS: '/admin/exam-migrations',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_APPOINTMENTS: '/admin/appointments',
  ADMIN_SCHEDULING: '/admin/scheduling',
  ADMIN_GRADING: '/admin/grading',

  // App (Tenant User)
  APP_DASHBOARD: '/app/dashboard',
  APP_PROFILE: '/app/profile',
  APP_EXAMS: '/app/exams',
  APP_EXAM_DETAIL: '/app/exams/:id',
  APP_EXAM_SESSION: '/app/exams/session/:attemptId',
  APP_RESULTS: '/app/results',
  APP_RESULT_DETAIL: '/app/results/:attemptId',
  APP_ORDERS: '/app/orders',
  APP_ORDER_DETAIL: '/app/orders/:id',
  APP_ORDER_CREATE: '/app/orders/new',
  APP_APPOINTMENTS: '/app/appointments',
  APP_APPOINTMENT_DETAIL: '/app/appointments/:id',
  APP_BOOKINGS: '/app/bookings',
} as const

// ---------- Academy ----------

export const ACADEMY_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const

export const ACADEMY_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
}

export const ACADEMY_STATUS_COLORS: Record<string, string> = {
  active: 'success',
  pending: 'warning',
  suspended: 'destructive',
}

export const ACADEMY_PLANS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const

// ---------- Exam ----------

export const EXAM_MODES = {
  TRIAL: 'trial',
  SKILL_PRACTICE: 'skill_practice',
  FULL_TEST: 'full_test',
} as const

export const EXAM_MODE_LABELS: Record<string, string> = {
  trial: 'Trial',
  skill_practice: 'Skill Practice',
  full_test: 'Full Test',
}

export const SKILL_TYPES = {
  LISTENING: 'listening',
  READING: 'reading',
  WRITING: 'writing',
  SPEAKING: 'speaking',
} as const

export const SKILL_LABELS: Record<string, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
}

export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  COMPLETED: 'completed',
} as const

export const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  submitted: 'Submitted',
  graded: 'Graded',
  completed: 'Completed',
}

export const SKILL_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
} as const

// ---------- Order ----------

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  error: 'Error',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  paid: 'default',
  processing: 'secondary',
  completed: 'success',
  failed: 'destructive',
  refunded: 'outline',
  cancelled: 'outline',
  error: 'destructive',
}

// ---------- Appointment ----------

export const APPOINTMENT_STATUS = {
  BOOKED: 'booked',
  CONFIRMED: 'confirmed',
  RESCHEDULE_REQUESTED: 'reschedule_requested',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  reschedule_requested: 'Reschedule Requested',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  booked: 'default',
  confirmed: 'success',
  reschedule_requested: 'warning',
  in_progress: 'secondary',
  completed: 'success',
  cancelled: 'outline',
}

// ---------- Grading ----------

export const GRADING_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export const GRADING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
}

// ---------- Pagination ----------

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// ---------- Time ----------

export const REFRESH_INTERVAL_MS = 60 * 1000 // 1 minute
export const POLL_INTERVAL_MS = 2 * 1000 // 2 seconds for order status polling
export const AUTO_SAVE_DEBOUNCE_MS = 5000 // 5 seconds for exam auto-save
export const EXAM_CHECKPOINT_INTERVAL_MS = 30 * 1000 // 30 seconds for checkpoint

// ---------- UI ----------

export const TOAST_DURATION_MS = 4000
export const CONFIRM_DIALOG_DELAY_MS = 300

// ---------- API ----------

export const API_TIMEOUT_MS = 30 * 1000 // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3
