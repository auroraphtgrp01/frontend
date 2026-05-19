// ============================================================
// Auth Types
// ============================================================

// ---------- Requests ----------

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
  voucher_code?: string
}

export interface Validate2FARequest {
  twofa_token: string
  code: string
}

export interface Toggle2FARequest {
  is_enabled: boolean
  password: string
}

export interface GoogleOAuthRequest {
  code?: string
  state?: string
}

// ---------- Responses ----------

export interface TokenPair {
  access_token: string
  expires_in: number
  token_type: string
}

export interface AuthResponse {
  user?: UserInfo
  tokens?: TokenPair
  access_token?: string
  requires_2fa?: boolean
  twofa_token?: string
  restored?: boolean
  action?: string
  academy_name?: string
  redirect_url?: string
  voucher_code?: string
  discount?: number
  new_total?: number
}

export interface UserInfo {
  id: string
  email: string
  name: string
  avatar?: string
  role?: string
}

// ---------- 2FA Types ----------

export interface Enable2FAResponse {
  secret: string
  provisioning_uri: string
}

export interface Verify2FAResponse {
  backup_codes: string[]
}

export interface TwoFAStatusResponse {
  is_activated: boolean
  is_enabled: boolean
  backup_codes_remaining: number
}

export interface Toggle2FAResponse {
  is_enabled: boolean
}

// ---------- JWT Types ----------

export interface JWTPayload {
  sub: string
  user_id: string
  email: string
  name: string
  role: string
  academy_id?: string
  academy_slug?: string
  academy_schema?: string
  exp: number
  iat: number
}

// ---------- Auth Context Types ----------

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}

export interface AcademyContext {
  academyId: string | null
  academyName: string | null
  setAcademy: (id: string | null, name: string | null) => void
  resetAcademy: () => void
}

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  academy: AcademyContext
  isLoading: boolean
  login: (data: LoginRequest) => Promise<AuthResponse>
  loginSuperAdmin: (data: LoginRequest) => Promise<AuthResponse>
  register: (data: RegisterRequest) => Promise<AuthResponse>
  logout: () => void
  isSuperAdmin: () => boolean
  isAdmin: () => boolean
  isTeacher: () => boolean
  canManageUsers: () => boolean
  canGrade: () => boolean
  hasRole: (...roles: string[]) => boolean
}

// ---------- Auth State ----------

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'requires_2fa'

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  academyId: string | null
  academyName: string | null
  twofaToken: string | null
  error: string | null
}

// ---------- API Error ----------

export interface AuthApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}

// ---------- Role Descriptions ----------

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  system_admin: 'Full platform access - manage all academies',
  academy_admin: 'Academy admin - manage academy users and settings',
  teacher: 'Teacher - grade exams and manage students',
  user: 'User - take exams and view results',
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  system_admin: ['*'],
  academy_admin: [
    'users:read', 'users:write', 'users:delete',
    'orders:read', 'orders:write',
    'appointments:read', 'appointments:write',
    'grading:read', 'grading:write',
    'academies:read',
    'analytics:read',
  ],
  teacher: [
    'grading:read', 'grading:write',
    'users:read',
  ],
  user: [
    'exams:read', 'exams:write',
    'orders:read', 'orders:write',
    'appointments:read',
    'results:read',
  ],
}
