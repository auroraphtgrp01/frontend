import type { CreateOrderRequest, CreateOrderResponse } from '@/types/order'
import type { Product } from '@/types/product'

export function buildPracticePackageOrderRequest(
  product: Product,
  voucherCode?: string,
  payableTotal?: number,
): CreateOrderRequest {
  return {
    product_id: product.id,
    quantity: 1,
    total: payableTotal ?? product.price,
    voucher_code: voucherCode || undefined,
  }
}

export function practicePackageCheckoutDestination(result: CreateOrderResponse): string {
  if (result.order.status === 'paid') {
    return '/app/packages'
  }
  return `/app/orders/${result.order_id}`
}
