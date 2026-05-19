import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

/** Optional request flag — response interceptor skips error toasts when true. */
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean
  }
}
import { toast } from 'sonner'
import {
  AUTH_STORAGE_KEYS,
  API_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS,
} from './constants'
import { decodeJwtPayload } from './jwt-claims'
import { clientUUID } from './uuid'

// ============================================================
// Configuration
// ============================================================

/**
 * Dev default is same-origin so Vite `/api` proxy can avoid CORS preflight issues.
 * Set `VITE_API_URL` explicitly for non-proxy environments (staging/prod local tests).
 */
const API_URL = import.meta.env.VITE_API_URL?.trim() || ''

// ============================================================
// Token Management
// ============================================================

let accessToken: string | null = null
/** From JWT `academy_id`; sent as `X-Academy-Id` for tenant-scoped services */
let tokenAcademyId: string | null = null
/** From JWT `academy_slug`; sent as `Academy` header when API host has no tenant subdomain */
let tokenAcademySlug: string | null = null

export const loadTokens = () => {
  accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
}

/**
 * Persist tenant slug + merge `role` from access JWT into stored user (login body omits role).
 */
export function applySessionSyncFromAccessToken(access: string) {
  if (!access) return
  const p = decodeJwtPayload(access)
  if (!p) return

  const academyID = typeof p.academy_id === 'string' ? p.academy_id.trim() : ''
  if (academyID) {
    tokenAcademyId = academyID
    localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_ID, academyID)
  }

  let slug = typeof p.academy_slug === 'string' ? p.academy_slug.trim() : ''
  if (!slug) {
    const fb = (import.meta.env.VITE_ACADEMY_SLUG as string | undefined)?.trim()
    if (fb) slug = fb
  }
  if (slug) {
    tokenAcademySlug = slug
    localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_SLUG, slug)
  }

  const role = typeof p.role === 'string' ? p.role.trim() : ''
  if (!role) return

  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER)
  if (!raw) return
  try {
    const u = JSON.parse(raw) as Record<string, unknown>
    if (u.role === role) return
    u.role = role
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(u))
  } catch {
    // ignore
  }
}

export const setTokens = (access: string, _refresh: string = '') => {
  accessToken = access
  localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, access)
  applySessionSyncFromAccessToken(access)
}

export const clearTokens = () => {
  accessToken = null
  tokenAcademyId = null
  tokenAcademySlug = null
  localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_ID)
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_SLUG)
}

export const getAccessToken = () => accessToken || localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)

// Initialize tokens on module load
loadTokens()
if (accessToken) {
  applySessionSyncFromAccessToken(accessToken)
} else {
  const storedAcademyId = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_ID)?.trim()
  if (storedAcademyId) tokenAcademyId = storedAcademyId
  const storedSlug = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_SLUG)?.trim()
  if (storedSlug) tokenAcademySlug = storedSlug
}

// ============================================================
// Academy Context
// ============================================================

let academyId: string | null = null
let academyName: string | null = null

export const setAcademyId = (id: string | null) => {
  academyId = id
  if (id) {
    localStorage.setItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_ID, id)
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_ID)
  }
}

export const getAcademyId = () =>
  academyId || localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_ID)

export const setAcademyName = (name: string | null) => {
  academyName = name
  if (name) {
    localStorage.setItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_NAME, name)
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_NAME)
  }
}

export const getAcademyName = () =>
  academyName || localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_NAME)

function academyIdFromAccessToken(token: string | null): string {
  if (!token) return ''
  const payload = decodeJwtPayload(token)
  return typeof payload?.academy_id === 'string' ? payload.academy_id.trim() : ''
}

export const initAcademyContext = () => {
  academyId = localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_ID)
  academyName = localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_NAME)
}

export const clearAcademyContext = () => {
  academyId = null
  academyName = null
  localStorage.removeItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_ID)
  localStorage.removeItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_NAME)
}

export const setAcademy = (id: string | null, name: string | null) => {
  setAcademyId(id)
  setAcademyName(name)
}

// Initialize academy context on module load
initAcademyContext()

// ============================================================
// API Instance
// ============================================================

const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // ---- Request Interceptor ----
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Attach access token
      const token = accessToken || localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      const requestPath = (config.url || '').toString()
      if (config.headers) {
        const role = token ? (decodeJwtPayload(token)?.role as string | undefined)?.trim() : undefined
        const needsRoleHeader = requestPath.includes('/api/v1/admin/exam-migrations')
        if (role && needsRoleHeader) {
          config.headers['X-User-Role'] = role
        }
      }

      // Tenant slug: required for identity-service when Host is plain localhost (not *.localhost)
      const reqPath = requestPath
      const isGlobalPath = reqPath.includes('/global/')
      if (!isGlobalPath && config.headers) {
        const slug =
          tokenAcademySlug ||
          localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_SLUG)?.trim() ||
          (import.meta.env.VITE_ACADEMY_SLUG as string | undefined)?.trim()
        if (slug) {
          config.headers['Academy'] = slug
        }
      }

      // Attach academy context
      const currentAcademyId =
        academyId ||
        localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_ID) ||
        tokenAcademyId ||
        localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_ID) ||
        academyIdFromAccessToken(token)
      if (currentAcademyId && config.headers) {
        config.headers['X-Academy-Id'] = currentAcademyId
      }

      // Attach request ID for tracing
      if (config.headers) {
        config.headers['X-Request-ID'] = clientUUID()
      }

      return config
    },
    (error) => Promise.reject(error),
  )

  // ---- Response Interceptor ----
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const skipToast = Boolean((error.config as InternalAxiosRequestConfig)?.skipErrorToast)

      // Handle 403 - Forbidden (no permission)
      if (error.response?.status === 403) {
        if (!skipToast) {
          const message =
            (error.response?.data as { message?: string })?.message ||
            'You do not have permission to perform this action.'
          toast.error(message)
        }
        return Promise.reject(error)
      }

      // Handle 404 - Not found
      if (error.response?.status === 404) {
        // Don't show toast for 404 - let the component handle it
        return Promise.reject(error)
      }

      // Handle other errors
      const errorMessage =
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        'An error occurred'

      // Don't show toast for cancelled requests or silent dashboard/auxiliary calls
      if (!axios.isCancel(error) && !skipToast) {
        toast.error(errorMessage)
      }

      return Promise.reject(error)
    },
  )

  return instance
}

// Export singleton instance
export const api = createApiInstance()
export default api

// ============================================================
// Utility Functions
// ============================================================

export const isAuthenticated = () =>
  !!(accessToken || localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN))

export const getUser = () => {
  const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    return null
  }
}

export const setUser = (user: Record<string, unknown> | null) => {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user))
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
  }
}

export const clearUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
}

export const clearAllAuth = () => {
  clearTokens()
  clearAcademyContext()
  clearUser()
}

// ============================================================
// Retry Helper
// ============================================================

export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = MAX_RETRY_ATTEMPTS,
): Promise<T> => {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error

      // Don't retry client errors (4xx except 429)
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error
        }
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        )
      }
    }
  }

  throw lastError
}
