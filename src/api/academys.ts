import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Academy } from '@/types'
import { toast } from 'sonner'

const academysApi = '/api/v1/global/academys'

export const useAcademys = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['academys'],
    queryFn: async () => {
      const response = await api.get<{ data: Academy[] }>(academysApi)
      return response.data.data
    },
    enabled: options?.enabled ?? true,
  })

export const useAcademy = (id: string) =>
  useQuery({
    queryKey: ['academy', id],
    queryFn: async () => {
      const response = await api.get<{ data: Academy }>(`${academysApi}/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })

export const useCreateAcademy = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Academy>) => {
      const response = await api.post<{ data: Academy }>(academysApi, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academys'] })
      toast.success('Tenant created successfully')
    },
    onError: () => {
      toast.error('Failed to create tenant')
    },
  })
}

export const useUpdateAcademy = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Academy> & { id: string }) => {
      const response = await api.put<{ data: Academy }>(`${academysApi}/${id}`, data)
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academys'] })
      queryClient.invalidateQueries({ queryKey: ['academy', variables.id] })
      toast.success('Tenant updated successfully')
    },
    onError: () => {
      toast.error('Failed to update tenant')
    },
  })
}

export const useDeleteAcademy = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${academysApi}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academys'] })
      toast.success('Tenant deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete tenant')
    },
  })
}
