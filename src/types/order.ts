// ============================================================
// Order & Payment Types
// ============================================================

import type { Appointment } from './appointment'

// ---------- Order ----------

export interface Order {
  id: string
  user_id: string
  user_name?: string
  user_email?: string
  academy_id: string
  academy_name?: string
  status: OrderStatus
  total: number
  subtotal?: number
  discount?: number
  selected_date?: string
  selected_date_from?: string
  selected_date_to?: string
  time_slot?: string
  voucher_code?: string
  referral_code?: string
  notes?: string
  fulfillment_mode?: FulfillmentMode
  payment_deadline_at?: string
  appointment_id?: number
  created_at: string
  updated_at: string
  products?: OrderProduct[]
  appointments?: Appointment[]
  payment?: OrderPayment
}

export type FulfillmentMode = 'scheduled_registration' | 'package'

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled'
  | 'error'

export interface OrderProduct {
  id: string
  order_id: string
  product_id: string
  name: string
  description?: string
  quantity: number
  price: number
  subtotal: number
  thumbnail?: string
  selected_date?: string
  selected_date_from?: string
  selected_date_to?: string
  time_slot?: string
}

export interface OrderPayment {
  id: string
  order_id: string
  provider: string
  amount: number
  status: string
  transaction_id?: string
  paid_at?: string
  raw_response?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface CreateOrderRequest {
  product_id: string
  quantity?: number
  selected_date?: string
  selected_date_from?: string
  selected_date_to?: string
  time_slot?: string
  time_slot_id?: number | string
  voucher_code?: string
  referral_code?: string
  notes?: string
  school_id?: number
  total: number
  is_date_based?: boolean
}

export interface RetailCheckoutLineItem {
  product_id: string
  quantity?: number
  selected_date?: string
  selected_date_from?: string
  selected_date_to?: string
  time_slot?: string
  time_slot_id?: string
}

export interface RetailCheckoutRequest {
  line_items: RetailCheckoutLineItem[]
  voucher_code?: string
  referral_code?: string
  notes?: string
  total: number
}

export interface CreateOrderResponse {
  order_id: string
  order: Order
  payment_url?: string
  fulfillment_mode?: FulfillmentMode
  payment_deadline_at?: string
  appointment_id?: number
}

export interface OrderAppointmentGroup {
  order_id: string
  order_status?: OrderStatus
  order_total?: number
  order_created_at?: string
  appointments: Appointment[]
}

export interface UpdateOrderRequest {
  status?: OrderStatus
  notes?: string
}

export interface OrderListParams {
  page?: number
  page_size?: number
  status?: OrderStatus
  academy_id?: string
  user_id?: string
  start_date?: string
  end_date?: string
  search?: string
}

export type {
  Product,
  PackageGroup,
  ProductCatalogGroup,
  ProductListResponse,
  ProductListParams,
  InvalidateProductCatalogRequest,
} from './product'

// ---------- Payment ----------

export interface PaymentVNPay {
  amount: number
  order_info: string
  txn_ref: string
  transaction_no?: string
  transaction_date?: string
  response_code?: string
}

export interface VNPayCallbackParams {
  code: string
  message?: string
  order_id?: string
  amount?: number
  transaction_no?: string
  transaction_date?: string
  vnp_ResponseCode?: string
  vnp_TransactionStatus?: string
  vnp_TxnRef?: string
  vnp_Amount?: string
  vnp_PayDate?: string
}

export interface PaymentResult {
  success: boolean
  order_id: string
  status: OrderStatus
  message?: string
  payment_status?: string
}

// ---------- Voucher ----------

export interface Voucher {
  code: string
  type: VoucherType
  value: number
  min_order_amount?: number
  max_discount?: number
  expires_at?: string
  is_valid: boolean
  description?: string
}

export type VoucherType = 'percentage' | 'fixed'

export type VoucherApplicableScope = 'package' | 'retail' | 'all'

export interface ValidateVoucherResponse {
  valid: boolean
  voucher?: Voucher
  discount_amount?: number
  message?: string
  new_total?: number
  usage_remaining?: number
  user_usage_remaining?: number
}

// ---------- Order Status Check ----------

export interface OrderStatusResponse {
  order_id: string
  status: OrderStatus
  payment_status: string
  paid_at?: string
  message?: string
}

// ---------- Time Slot ----------

export interface TimeSlot {
  id: number
  time: string
  label?: string
  available?: boolean
  capacity?: number
}

// ---------- Order Timeline ----------

export interface OrderTimelineEvent {
  id: string
  order_id: string
  event_type: string
  event_label: string
  description?: string
  created_at: string
  metadata?: Record<string, unknown>
}
