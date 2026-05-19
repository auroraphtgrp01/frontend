// ============================================================
// Shared Types
// ============================================================

// Re-export auth types
export * from './auth'

// Re-export appointment types (includes scheduling types - TimeSlot, SchedulingDay, etc.)
export * from './appointment'

export * from './product'

// Re-export order types
export { type Order, type OrderStatus, type OrderProduct, type CreateOrderRequest, type CreateOrderResponse } from './order'

// Re-export booking types (after appointment to use BookingAppointment alias)
export * from './booking'

// Re-export exam types
export * from './exam'

// ---------- Academy (Tenant) ----------

export interface Academy {
  id: string
  name: string
  slug: string
  schema: string
  schema_name?: string
  description: string | null
  is_active: boolean
  status?: string
  plan?: string
  created_at: string
  updated_at: string
}

export interface AcademyDetail extends Academy {
  total_users?: number
  total_exams?: number
  total_orders?: number
  created_at: string
  updated_at: string
}

export interface CreateAcademyRequest {
  name: string
  slug: string
  description?: string
  plan?: string
  admin?: AdminAccountRequest
}

export interface AdminAccountRequest {
  name: string
  email: string
  password: string
}

export interface UpdateAcademyRequest {
  name?: string
  status?: string
  plan?: string
}

// ---------- User ----------

export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
  academy_id: string | null
  academy_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserDetail extends User {
  exam_attempts?: number
  completed_exams?: number
  total_orders?: number
}

export interface CreateUserRequest {
  name: string
  email: string
  password?: string
  role: string
  academy_id?: string
  is_active?: boolean
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  password?: string
  role?: string
  is_active?: boolean
}

// ---------- Pagination ----------

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  total_pages?: number
  has_more?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// ---------- API Response ----------

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}

// ---------- Common ----------

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface KeyValue {
  key: string
  value: string | number | boolean
}

export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface EmptyState {
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export interface ErrorState {
  title: string
  description?: string
  retry?: () => void
}
