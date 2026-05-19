export interface Product {
  id: string
  code?: string
  name: string
  description?: string
  price: number
  package_group?: PackageGroup
  validity_value?: number | null
  validity_unit?: string
  thumbnail?: string
  features?: string[]
}

export type PackageGroup = 'four_skill' | 'three_skill'

export interface ProductCatalogGroup {
  group: PackageGroup
  label: string
  products: Product[]
}

export interface ProductListResponse {
  groups: ProductCatalogGroup[]
}

export interface ProductListParams {
  search?: string
  sort_by?: 'price' | 'name' | 'created_at'
  sort_order?: 'asc' | 'desc'
  catalog?: 'retail'
}

export type WritingFeedbackMode = 'task1' | 'task2'

export interface RetailRegistrationProduct {
  id: string
  code?: string
  name: string
  description?: string
  price: number
  product_kind?: string
  role?: 'lrw' | 'speaking' | WritingFeedbackMode
  writing_feedback?: WritingFeedbackMode
}

export interface RetailRegistrationCatalog {
  lrw?: RetailRegistrationProduct
  speaking?: RetailRegistrationProduct
  writing_addons: RetailRegistrationProduct[]
}

export interface InvalidateProductCatalogRequest {
  academy_schema?: string
}
