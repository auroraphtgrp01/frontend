import { describe, expect, it } from 'vitest'
import { normalizeProductCatalogPayload } from './package-catalog'

describe('package catalog normalization', () => {
  it('keeps grouped practice packages returned by the product API', () => {
    const groups = normalizeProductCatalogPayload({
      groups: [
        {
          group: 'four_skill',
          label: '4 kỹ năng',
          products: [
            {
              id: '05139b57-b57d-42e9-8e61-3ca193b4306d',
              code: 'best-package-9',
              name: 'Gói thi  6 tháng',
              price: 3788000,
              package_group: 'four_skill',
              exam_usage_type: 'practice',
              validity_value: 6,
              validity_unit: 'month',
            },
          ],
        },
        {
          group: 'three_skill',
          label: '3 kỹ năng',
          products: [
            {
              id: '90e4361e-ebe5-4448-8c53-8433536da24d',
              code: 'simple-package-17',
              name: 'Gói thi 3 kỹ năng 1 ngày',
              price: 159000,
              package_group: 'three_skill',
              exam_usage_type: 'practice',
              validity_value: 1,
              validity_unit: 'day',
            },
          ],
        },
      ],
    })

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      group: 'four_skill',
      label: '4 kỹ năng',
      products: [{ code: 'best-package-9' }],
    })
    expect(groups[1]).toMatchObject({
      group: 'three_skill',
      label: '3 kỹ năng',
      products: [{ code: 'simple-package-17' }],
    })
  })
})
