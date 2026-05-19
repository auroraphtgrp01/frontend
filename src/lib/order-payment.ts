import type { Order } from '@/types/order'

export function isOrderPaymentAvailable(
  order: Pick<Order, 'status' | 'payment_deadline_at'>,
): boolean {
  if (order.status !== 'pending') return false
  if (!order.payment_deadline_at) return true
  return new Date(order.payment_deadline_at).getTime() > Date.now()
}

export function isOrderPaymentExpired(
  order: Pick<Order, 'status' | 'payment_deadline_at'>,
): boolean {
  return order.status === 'pending' && !isOrderPaymentAvailable(order)
}
