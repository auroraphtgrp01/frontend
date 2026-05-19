import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import { normalizeProductCatalogPayload } from '@/lib/package-catalog'
import type {
  InvalidateProductCatalogRequest,
  Product,
  ProductCatalogGroup,
  ProductListParams,
  RetailRegistrationCatalog,
  RetailRegistrationProduct,
} from '@/types/product'
import { normalizeRetailRegistrationCatalog } from '@/lib/retail-registration'

type ApiProductListPayload = {
  groups?: ProductCatalogGroup[]
  products?: Array<Product & {
    product_kind?: string
    lrw_enabled?: boolean
    speaking_enabled?: boolean
  }>
}

export const useProducts = (params?: ProductListParams) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await api.get('/api/v1/products', { params })
      const body = response.data
      if (
        body &&
        typeof body === 'object' &&
        'success' in body &&
        (body as { success?: boolean }).success === false
      ) {
        const message =
          (body as { error?: { message?: string } }).error?.message ??
          'Không tải được danh sách gói thi'
        throw new Error(message)
      }

      const payload = unwrapApiData<ApiProductListPayload>(body)
      const groups = normalizeProductCatalogPayload(payload)
      const data = groups.flatMap((group) => group.products ?? [])
      return { data, groups }
    },
  })
}

export const useRetailRegistrationCatalog = () => {
  return useQuery({
    queryKey: ['products', 'retail'],
    queryFn: async () => {
      const response = await api.get('/api/v1/products', { params: { catalog: 'retail' } })
      const body = response.data
      if (
        body &&
        typeof body === 'object' &&
        'success' in body &&
        (body as { success?: boolean }).success === false
      ) {
        const message =
          (body as { error?: { message?: string } }).error?.message ??
          'Không tải được danh sách đăng ký lẻ'
        throw new Error(message)
      }

      const payload = unwrapApiData<RetailRegistrationCatalog & {
        products?: Array<RetailRegistrationProduct & {
          product_kind?: string
          lrw_enabled?: boolean
          speaking_enabled?: boolean
          requires_date_selection?: boolean
        }>
        groups?: Array<{
          products?: Array<RetailRegistrationProduct & {
            product_kind?: string
            lrw_enabled?: boolean
            speaking_enabled?: boolean
            requires_date_selection?: boolean
          }>
        }>
      }>(body)

      let catalog = normalizeRetailRegistrationCatalog(payload)
      const fallbackResponse = await api.get('/api/v1/products')
      const fallbackPayload = unwrapApiData<typeof payload>(fallbackResponse.data)
      catalog = normalizeRetailRegistrationCatalog({
        products: fallbackPayload.products,
        groups: fallbackPayload.groups,
        lrw: catalog.lrw,
        speaking: catalog.speaking,
        writing_addons: catalog.writing_addons,
      })

      return catalog
    },
  })
}

export const useProduct = (productId: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/products/${productId}`)
      return unwrapApiData<Product>(response.data)
    },
    enabled: productId.trim().length > 0,
  })
}

export const useInvalidateProductCatalog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data?: InvalidateProductCatalogRequest) => {
      const response = await api.post('/api/v1/platform/products/catalog/invalidate', data ?? {})
      return unwrapApiData<{ invalidated: boolean }>(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'retail'] })
    },
  })
}
