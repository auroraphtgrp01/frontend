import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api } from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import { mapApiAppointment, type ApiAppointment } from '@/lib/appointment-mapping'
import type {
  Order,
  OrderListParams,
  CreateOrderRequest,
  CreateOrderResponse,
  RetailCheckoutRequest,
  UpdateOrderRequest,
  OrderStatusResponse,
  TimeSlot,
  OrderProduct,
  OrderStatus,
} from '@/types/order'

// ----- Backend shapes (order-service HTTP) -----

type ApiOrderProductLine = {
  id?: number | string
  quantity: number
  price: number
  product_id: string
  name?: string
  selected_date?: string | null
  selected_date_from?: string | null
  selected_date_to?: string | null
  time_slot?: string
}

type ApiOrderDetail = {
  id: number | string
  voucher_code?: string | null
  referral_code?: string | null
  notes?: string
  status: string
  total: number
  academy_id: number | string
  user_id: number | string
  school_id?: number | null
  expiration_date?: string | null
  payment_deadline_at?: string | null
  fulfillment_mode?: string | null
  created_at: string
  updated_at: string
  order_products: ApiOrderProductLine[]
  appointments?: ApiAppointment[]
}

type ApiOrderListItem = {
  id: number
  total: number
  status: string
  code: string
  created_at: string
  products?: Array<{
    product_id: string
    name: string
    quantity: number
    price: number
  }>
}

type ApiOrderListPayload = {
  orders: ApiOrderListItem[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

type ApiCreateOrderPayload = {
  id: number | string
  total: number
  status: string
  vnp_url?: string
  code: string
  created_at?: string
  fulfillment_mode?: string
  payment_deadline_at?: string
  appointment_id?: number | string
}

type ApiTimeSlot = {
  id: number
  time_slot: string
  shift_slot?: string
  is_available?: boolean
}

function toOrderStatus(s: string): OrderStatus {
  const allowed: OrderStatus[] = [
    'pending',
    'paid',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled',
    'error',
  ]
  return (allowed.includes(s as OrderStatus) ? s : 'pending') as OrderStatus
}

function toOptionalDate(value?: string | null): string | undefined {
  if (!value) return undefined
  return value
}

function mapApiOrderProductLine(d: ApiOrderDetail, line: ApiOrderProductLine): OrderProduct {
  return {
    id: String(line.id ?? line.product_id),
    order_id: String(d.id),
    product_id: line.product_id,
    name: line.name ?? `Product #${line.product_id}`,
    quantity: line.quantity,
    price: line.price,
    subtotal: line.quantity * line.price,
    selected_date: toOptionalDate(line.selected_date),
    selected_date_from: toOptionalDate(line.selected_date_from),
    selected_date_to: toOptionalDate(line.selected_date_to),
    time_slot: line.time_slot || undefined,
  }
}

function deriveOrderSchedule(products: OrderProduct[]): Pick<
  Order,
  'selected_date' | 'selected_date_from' | 'selected_date_to' | 'time_slot'
> {
  const scheduled = products.find(
    (product) =>
      product.selected_date ||
      product.selected_date_from ||
      product.selected_date_to ||
      product.time_slot,
  )
  if (!scheduled) {
    return {}
  }

  return {
    selected_date: scheduled.selected_date,
    selected_date_from: scheduled.selected_date_from,
    selected_date_to: scheduled.selected_date_to,
    time_slot: scheduled.time_slot,
  }
}

function mapApiOrderDetail(d: ApiOrderDetail): Order {
  const products: OrderProduct[] = (d.order_products || []).map((line) =>
    mapApiOrderProductLine(d, line),
  )
  const schedule = deriveOrderSchedule(products)

  return {
    id: String(d.id),
    user_id: String(d.user_id),
    academy_id: String(d.academy_id),
    status: toOrderStatus(d.status),
    total: d.total,
    notes: d.notes ?? '',
    voucher_code: d.voucher_code ?? undefined,
    referral_code: d.referral_code ?? undefined,
    fulfillment_mode: d.fulfillment_mode as Order['fulfillment_mode'],
    payment_deadline_at: d.payment_deadline_at ?? undefined,
    created_at: d.created_at,
    updated_at: d.updated_at,
    products,
    appointments: (d.appointments ?? []).map(mapApiAppointment),
    ...schedule,
  }
}

function mapApiOrderListItem(o: ApiOrderListItem): Order {
  const products: OrderProduct[] = (o.products || []).map((line, idx) => ({
    id: `line-${o.id}-${idx}`,
    order_id: String(o.id),
    product_id: line.product_id,
    name: line.name || `Product #${line.product_id}`,
    quantity: line.quantity,
    price: line.price,
    subtotal: line.quantity * line.price,
  }))

  return {
    id: String(o.id),
    user_id: '',
    academy_id: '',
    status: toOrderStatus(o.status),
    total: o.total,
    created_at: o.created_at,
    updated_at: o.created_at,
    products,
  }
}

// ============================================================
// Order Queries
// ============================================================

export const useOrders = (params?: OrderListParams) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const response = await api.get('/api/v1/orders', { params })
      const payload = unwrapApiData<ApiOrderListPayload>(response.data)
      const rows = (payload.orders || []).map(mapApiOrderListItem)
      return {
        data: rows,
        meta: {
          total: payload.total,
          page: payload.page,
          per_page: payload.per_page,
          total_pages: payload.total_pages,
        },
      }
    },
  })
}

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/orders/${orderId}`)
      const inner = unwrapApiData<ApiOrderDetail>(response.data)
      return mapApiOrderDetail(inner)
    },
    enabled: !!orderId,
  })
}

export const useOrderStatus = (orderId: string, enabled = true) => {
  return useQuery({
    queryKey: ['order-status', orderId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/orders/${orderId}/status`)
      const d = unwrapApiData<{ status: string; is_paid?: boolean }>(response.data)
      const mapped: OrderStatusResponse = {
        order_id: orderId,
        status: toOrderStatus(d.status),
        payment_status: d.is_paid ? 'paid' : 'unpaid',
      }
      return mapped
    },
    enabled: !!orderId && enabled,
    refetchInterval: 2000,
    retry: 3,
  })
}

// ============================================================
// Order Mutations
// ============================================================

function parseCreateOrderResponse(body: unknown): CreateOrderResponse {
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    (body as { success?: boolean }).success === false
  ) {
    const message =
      (body as { error?: { message?: string } }).error?.message ?? 'Không tạo được đơn hàng'
    throw new Error(message)
  }

  const inner = unwrapApiData<ApiCreateOrderPayload>(body)
  return {
    order_id: String(inner.id),
    payment_url: inner.vnp_url,
    fulfillment_mode: inner.fulfillment_mode as CreateOrderResponse['fulfillment_mode'],
    payment_deadline_at: inner.payment_deadline_at,
    appointment_id:
      inner.appointment_id != null ? Number(inner.appointment_id) : undefined,
    order: mapApiOrderDetail({
      id: inner.id,
      status: inner.status,
      total: inner.total,
      user_id: 0,
      academy_id: 0,
      notes: '',
      created_at: inner.created_at || new Date().toISOString(),
      updated_at: inner.created_at || new Date().toISOString(),
      payment_deadline_at: inner.payment_deadline_at,
      fulfillment_mode: inner.fulfillment_mode,
      order_products: [],
    }),
  }
}

export const useCreateOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      try {
        const response = await api.post('/api/v1/orders', data)
        return parseCreateOrderResponse(response.data)
      } catch (error) {
        if (isAxiosError(error)) {
          const message =
            (error.response?.data as { error?: { message?: string } } | undefined)?.error
              ?.message ?? error.message
          throw new Error(message)
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['practice-entitlements'] })
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['order-appointments'] })
    },
  })
}

export const useRetailCheckout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RetailCheckoutRequest) => {
      try {
        const response = await api.post('/api/v1/orders/retail-checkout', data)
        return parseCreateOrderResponse(response.data)
      } catch (error) {
        if (isAxiosError(error)) {
          const message =
            (error.response?.data as { error?: { message?: string } } | undefined)?.error
              ?.message ?? error.message
          throw new Error(message)
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['practice-entitlements'] })
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['order-appointments'] })
    },
  })
}

export const useUpdateOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: UpdateOrderRequest }) => {
      const response = await api.patch(`/api/v1/orders/${orderId}`, data)
      return unwrapApiData<Order>(response.data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', data.id] })
    },
  })
}

export const useCancelOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/api/v1/orders/${orderId}/cancel`)
      const inner = unwrapApiData<ApiOrderDetail>(response.data)
      return mapApiOrderDetail(inner)
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['my-appointments-by-order'] })
      queryClient.invalidateQueries({ queryKey: ['order-appointments'] })
    },
  })
}

// ============================================================
// Time Slots
// ============================================================

export const useTimeSlots = (date?: string) => {
  return useQuery({
    queryKey: ['time-slots', date],
    queryFn: async () => {
      const response = await api.get('/api/v1/time-slots', {
        params: date ? { date } : undefined,
      })
      const rows = unwrapApiData<ApiTimeSlot[]>(response.data)
      return rows.map((slot) => ({
        id: slot.id,
        time: slot.time_slot,
        label: slot.shift_slot || slot.time_slot,
        available: slot.is_available ?? true,
      })) satisfies TimeSlot[]
    },
  })
}

// ============================================================
// Academy admin orders (tenant-scoped; JWT role academy_admin)
// ============================================================

type ApiAdminOrderListItem = ApiOrderListItem & {
  buyer?: { id?: string; name?: string; email?: string }
  fulfillment_mode?: string | null
  payment_deadline_at?: string | null
}

function mapApiAdminOrderListItem(o: ApiAdminOrderListItem): Order {
  const base = mapApiOrderListItem(o)
  return {
    ...base,
    user_id: o.buyer?.id ? String(o.buyer.id) : base.user_id,
    user_name: o.buyer?.name,
    user_email: o.buyer?.email,
    fulfillment_mode: o.fulfillment_mode as Order['fulfillment_mode'],
    payment_deadline_at: o.payment_deadline_at ?? undefined,
  }
}

export const useRetailRegistrations = (params?: OrderListParams) => {
  return useQuery({
    queryKey: ['retail-registrations', params],
    queryFn: async () => {
      const response = await api.get('/api/v1/retail-registrations', { params })
      const payload = unwrapApiData<ApiOrderListPayload>(response.data)
      const rows = (payload.orders || []).map(mapApiOrderListItem)
      return {
        data: rows,
        meta: {
          total: payload.total,
          page: payload.page,
          per_page: payload.per_page,
          total_pages: payload.total_pages,
        },
      }
    },
  })
}

export const useAdminRetailRegistrations = (params?: OrderListParams) => {
  return useQuery({
    queryKey: ['academy-admin-retail-registrations', params],
    queryFn: async () => {
      const response = await api.get('/api/v1/academy-admin/retail-registrations', { params })
      const payload = unwrapApiData<ApiOrderListPayload & { orders?: ApiAdminOrderListItem[] }>(
        response.data,
      )
      const rows = (payload.orders || []).map(mapApiAdminOrderListItem)
      return {
        data: rows,
        meta: {
          total: payload.total,
          page: payload.page,
          per_page: payload.per_page,
          total_pages: payload.total_pages,
        },
      }
    },
  })
}

export const useAdminOrders = (params?: OrderListParams & { academy_id?: string }) => {
  return useQuery({
    queryKey: ['academy-admin-orders', params],
    queryFn: async () => {
      const response = await api.get('/api/v1/academy-admin/orders', { params })
      const payload = unwrapApiData<ApiOrderListPayload>(response.data)
      const rows = (payload.orders || []).map(mapApiOrderListItem)
      return {
        data: rows,
        meta: {
          total: payload.total,
          page: payload.page,
          per_page: payload.per_page,
          total_pages: payload.total_pages,
        },
      }
    },
  })
}

export const useAdminOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['academy-admin-order', orderId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/academy-admin/orders/${orderId}`)
      const inner = unwrapApiData<ApiOrderDetail>(response.data)
      return mapApiOrderDetail(inner)
    },
    enabled: !!orderId,
  })
}

export const useAdminUpdateOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: UpdateOrderRequest }) => {
      const response = await api.patch(`/api/v1/academy-admin/orders/${orderId}`, data)
      return unwrapApiData<Order>(response.data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['academy-admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['academy-admin-order', data.id] })
      queryClient.invalidateQueries({ queryKey: ['order', data.id] })
    },
  })
}

export const useAdminRefundOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const response = await api.post(`/api/v1/academy-admin/orders/${orderId}/refund`, { reason })
      return unwrapApiData<Order>(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
