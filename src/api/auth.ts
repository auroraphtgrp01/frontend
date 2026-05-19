import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api, setTokens, setUser, clearAllAuth } from '@/lib/axios'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Enable2FAResponse,
  Verify2FAResponse,
  TwoFAStatusResponse,
  Toggle2FAResponse,
} from '@/types/auth'

// ============================================================
// Login / Register
// ============================================================

export const useLogin = () => {
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await api.post('/api/v1/auth/login', data)
      return response.data.data as AuthResponse
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user as unknown as Record<string, unknown>)
      }
      if (data.tokens) {
        setTokens(data.tokens.access_token)
      } else if (data.access_token) {
        setTokens(data.access_token)
      }
    },
  })
}

export const useSuperAdminLogin = () => {
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await api.post('/api/v1/global/auth/login', data)
      return response.data.data as AuthResponse
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user as unknown as Record<string, unknown>)
      }
      if (data.tokens) {
        setTokens(data.tokens.access_token)
      } else if (data.access_token) {
        setTokens(data.access_token)
      }
    },
  })
}

export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await api.post('/api/v1/auth/register', data)
      return response.data.data as AuthResponse
    },
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user as unknown as Record<string, unknown>)
      }
      if (data.tokens) {
        setTokens(data.tokens.access_token)
      } else if (data.access_token) {
        setTokens(data.access_token)
      }
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Logout is client-side only - just clear auth state
    },
    onSettled: () => {
      clearAllAuth()
      queryClient.clear()
      window.location.href = '/login'
    },
  })
}

// ============================================================
// 2FA
// ============================================================

export const useEnable2FA = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/v1/auth/2fa/enable')
      return response.data.data as Enable2FAResponse
    },
  })
}

export const useVerify2FA = () => {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/api/v1/auth/2fa/verify', { code })
      return response.data.data as Verify2FAResponse
    },
  })
}

export const useDisable2FA = () => {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/api/v1/auth/2fa/disable', { code })
      return response.data.data as { success: boolean }
    },
  })
}

export const useToggle2FA = () => {
  return useMutation({
    mutationFn: async (data: { is_enabled: boolean; password: string }) => {
      const response = await api.put('/api/v1/auth/2fa/toggle', data)
      return response.data.data as Toggle2FAResponse
    },
  })
}

export const useValidate2FA = () => {
  return useMutation({
    mutationFn: async (data: { twofa_token: string; code: string }) => {
      const response = await api.post('/api/v1/auth/2fa/validate', data)
      const respData = response.data.data as AuthResponse
      if (respData.user) {
        setUser(respData.user as unknown as Record<string, unknown>)
      }
      if (respData.tokens) {
        setTokens(respData.tokens.access_token)
      } else if (respData.access_token) {
        setTokens(respData.access_token)
      }
      return respData
    },
  })
}

export const use2FAStatus = () => {
  return useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const response = await api.get('/api/v1/auth/2fa/status')
      return response.data.data as TwoFAStatusResponse
    },
    enabled: !!localStorage.getItem('access_token'),
  })
}

// ============================================================
// User Profile
// ============================================================

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await api.get('/api/v1/users/me')
      return response.data.data as unknown
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/** system_admin only — GET /api/v1/global/users/me */
export const useGlobalPlatformMe = () => {
  return useQuery({
    queryKey: ['global-platform-me'],
    queryFn: async () => {
      const response = await api.get('/api/v1/global/users/me')
      return response.data.data as Record<string, unknown>
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name?: string; email?: string; avatar?: string }) => {
      const response = await api.put('/api/v1/users/me', data)
      return response.data.data as unknown
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      if (data && typeof data === 'object') {
        setUser(data as Record<string, unknown>)
      }
    },
  })
}
