import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { User } from '@/types'
import { toast } from 'sonner'
import { unwrapApiData } from '@/lib/api-envelope'

const globalUsersPath = '/api/v1/global/users'
const academyUsersPath = '/api/v1/users'

/**
 * system_admin: platform user list. Optional query params are forwarded as-is
 * (identity `ListUsersRequest` currently uses page/per_page/search only).
 */
export const useGlobalUsers = (
  academyId?: string,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: ['global-users', academyId ?? '__all__'],
    queryFn: async () => {
      const params = academyId ? { academy_id: academyId } : {}
      const response = await api.get(globalUsersPath, { params })
      return unwrapApiData<User[]>(response.data)
    },
    enabled: options?.enabled ?? true,
  })

/** Tenant-scoped list (requires `Academy` header / JWT academy context). */
export const useAcademyUsers = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['academy-users'],
    queryFn: async () => {
      const response = await api.get(academyUsersPath)
      return unwrapApiData<User[]>(response.data)
    },
    enabled: options?.enabled ?? true,
  })

export const useUser = (id: string) =>
  useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/users/${id}`)
      return unwrapApiData<User>(response.data)
    },
    enabled: !!id,
  })

export const useCreateUser = (scope: 'global' | 'academy' = 'academy') => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<User> & { password: string }) => {
      const url = scope === 'global' ? globalUsersPath : academyUsersPath
      const response = await api.post(url, data)
      return unwrapApiData<User>(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-users'] })
      queryClient.invalidateQueries({ queryKey: ['academy-users'] })
      toast.success('User created successfully')
    },
    onError: () => {
      toast.error('Failed to create user')
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<User> & { id: string }) => {
      const response = await api.put(`/api/v1/users/${id}`, data)
      return unwrapApiData<User>(response.data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-users'] })
      queryClient.invalidateQueries({ queryKey: ['academy-users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
      toast.success('User updated successfully')
    },
    onError: () => {
      toast.error('Failed to update user')
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-users'] })
      queryClient.invalidateQueries({ queryKey: ['academy-users'] })
      toast.success('User deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete user')
    },
  })
}
