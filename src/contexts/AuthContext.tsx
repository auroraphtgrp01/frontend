import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import {
  api,
  setTokens,
  clearAcademyContext,
  getUser,
  setUser,
  clearAllAuth,
  setAcademy,
} from '@/lib/axios'
import {
  AUTH_STORAGE_KEYS,
  ROLES,
  ADMIN_ROLES,
  GRADING_ROLES,
} from '@/lib/constants'
import type {
  AuthUser,
  AcademyContext,
  AuthContextValue,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserInfo,
} from '@/types/auth'

// ============================================================
// Helpers
// ============================================================

function mapUserInfoToAuthUser(info: UserInfo): AuthUser {
  return {
    id: info.id,
    email: info.email,
    name: info.name,
    role: info.role ?? ROLES.USER,
    avatar: info.avatar,
  }
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// ============================================================
// Provider
// ============================================================

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {

  const [user, setUserState] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Academy context
  const [academyId, setAcademyIdState] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_ID)
  })
  const [academyName, setAcademyNameState] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_ACADEMY_NAME) || null
  })

  // ---- Initialize auth state from localStorage ----
  useEffect(() => {
    const storedUser = getUser()
    if (storedUser) {
      setUserState(mapUserInfoToAuthUser(storedUser as unknown as UserInfo))
    }
    setIsLoading(false)
  }, [])

  // ---- Academy context actions ----
  const academy = useMemo<AcademyContext>(
    () => ({
      academyId,
      academyName,
      setAcademy: (id: string | null, name: string | null) => {
        setAcademyIdState(id)
        setAcademyNameState(name)
        setAcademy(id, name) // Sync with axios module
      },
      resetAcademy: () => {
        setAcademyIdState(null)
        setAcademyNameState(null)
        clearAcademyContext()
      },
    }),
    [academyId, academyName],
  )

  // ---- Login (tenant user) ----
  const login = useCallback(async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/v1/auth/login', data)
      const respData = response.data.data as AuthResponse

      // Check if 2FA is required
      if (respData.requires_2fa && respData.twofa_token) {
        localStorage.setItem(AUTH_STORAGE_KEYS.TWOFA_TOKEN, respData.twofa_token)
        return respData // Caller should redirect to 2FA page
      }

      // User first so JWT sync can merge `role` into localStorage
      if (respData.user) {
        setUser(respData.user as unknown as Record<string, unknown>)
      }
      if (respData.tokens) {
        setTokens(respData.tokens.access_token)
      } else if (respData.access_token) {
        setTokens(respData.access_token)
      }
      const stored = getUser()
      if (stored) {
        setUserState(mapUserInfoToAuthUser(stored as unknown as UserInfo))
      }

      return respData
    } catch (error) {
      throw error
    }
  }, [])

  // ---- SuperAdmin Login ----
  const loginSuperAdmin = useCallback(async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/v1/global/auth/login', data)
      const respData = response.data.data as AuthResponse

      if (respData.user) {
        setUser(respData.user as unknown as Record<string, unknown>)
      }
      if (respData.tokens) {
        setTokens(respData.tokens.access_token)
      } else if (respData.access_token) {
        setTokens(respData.access_token)
      }
      const stored = getUser()
      if (stored) {
        setUserState(mapUserInfoToAuthUser(stored as unknown as UserInfo))
      }

      return respData
    } catch (error) {
      throw error
    }
  }, [])

  // ---- Register ----
  const register = useCallback(async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/v1/auth/register', data)
      const respData = response.data.data as AuthResponse

      if (respData.user) {
        setUser(respData.user as unknown as Record<string, unknown>)
      }
      if (respData.tokens) {
        setTokens(respData.tokens.access_token)
      } else if (respData.access_token) {
        setTokens(respData.access_token)
      }
      const stored = getUser()
      if (stored) {
        setUserState(mapUserInfoToAuthUser(stored as unknown as UserInfo))
      }

      return respData
    } catch (error) {
      throw error
    }
  }, [])

  // ---- Logout ----
  const logout = useCallback(() => {
    // Clear all auth state
    clearAllAuth()
    setUserState(null)
    setAcademyIdState(null)
    setAcademyNameState(null)

    // Redirect to login
    window.location.href = '/login'
  }, [])

  // ---- Role helpers ----
  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user?.role) return false
      return roles.includes(user.role)
    },
    [user?.role],
  )

  const isSuperAdmin = useCallback(() => {
    return user?.role === ROLES.SYSTEM_ADMIN
  }, [user?.role])

  const isAdmin = useCallback(() => {
    if (!user?.role) return false
    return ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])
  }, [user?.role])

  const isTeacher = useCallback(() => {
    return user?.role === ROLES.TEACHER
  }, [user?.role])

  const canManageUsers = useCallback(() => {
    if (!user?.role) return false
    return [ROLES.SYSTEM_ADMIN, ROLES.ACADEMY_ADMIN].includes(
      user.role as (typeof ADMIN_ROLES)[number],
    )
  }, [user?.role])

  const canGrade = useCallback(() => {
    if (!user?.role) return false
    return GRADING_ROLES.includes(user.role as (typeof GRADING_ROLES)[number])
  }, [user?.role])

  // ---- Computed ----
  const isAuthenticated = useMemo(() => {
    const hasToken = !!(
      localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    )
    return !!user && hasToken
  }, [user])

  // ---- Context value ----
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      academy,
      login,
      loginSuperAdmin,
      register,
      logout,
      isSuperAdmin,
      isAdmin,
      isTeacher,
      canManageUsers,
      canGrade,
      hasRole,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      academy,
      login,
      loginSuperAdmin,
      register,
      logout,
      isSuperAdmin,
      isAdmin,
      isTeacher,
      canManageUsers,
      canGrade,
      hasRole,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================================
// Auth Guard Hook
// ============================================================

export const useAuthGuard = () => {
  const { isAuthenticated, isLoading, user } = useAuth()

  return useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      redirectTo: (path: string) => {
        window.location.href = path
      },
    }),
    [isAuthenticated, isLoading, user],
  )
}

// ============================================================
// Academy Selector Hook
// ============================================================

export const useAcademySelector = () => {
  const { academy } = useAuth()

  const selectAcademy = useCallback(
    (id: string | null, name: string | null) => {
      academy.setAcademy(id, name)
    },
    [academy],
  )

  return {
    academyId: academy.academyId,
    academyName: academy.academyName,
    selectAcademy,
    resetAcademy: academy.resetAcademy,
    hasAcademy: !!academy.academyId,
  }
}
