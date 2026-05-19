import { describe, expect, it } from 'vitest'
import {
  buildPracticePackageOrderRequest,
  practicePackageCheckoutDestination,
} from './practice-package-registration'
import type { CreateOrderResponse } from '@/types/order'
import type { Product } from '@/types/product'

const product: Product = {
  id: '05139b57-b57d-42e9-8e61-3ca193b4306d',
  code: 'best-package-9',
  name: 'Gói thi  6 tháng',
  price: 3788000,
  package_group: 'four_skill',
  validity_value: 6,
  validity_unit: 'month',
}

describe('practice package registration', () => {
  it('builds the order-service package checkout payload', () => {
    expect(buildPracticePackageOrderRequest(product, 'PRACTICE10')).toEqual({
      product_id: product.id,
      quantity: 1,
      total: product.price,
      voucher_code: 'PRACTICE10',
    })
  })

  it('sends paid package checkouts to the practice hub', () => {
    const result = {
      order_id: '4fd698ce-4e88-40bf-8dd0-ccdf4ce12260',
      order: {
        id: '4fd698ce-4e88-40bf-8dd0-ccdf4ce12260',
        user_id: 'user-id',
        academy_id: 'academy-id',
        status: 'paid',
        total: product.price,
        created_at: '2026-05-16T00:00:00Z',
        updated_at: '2026-05-16T00:00:00Z',
      },
    } satisfies CreateOrderResponse

    expect(practicePackageCheckoutDestination(result)).toBe('/app/packages')
  })
})
