import type { PackageGroup, Product, ProductCatalogGroup } from '@/types/product'

export const PACKAGE_CATALOG_GROUPS: ProductCatalogGroup[] = [
  {
    group: 'four_skill',
    label: 'Gói 4 kỹ năng',
    products: [],
  },
  {
    group: 'three_skill',
    label: 'Gói 3 kỹ năng',
    products: [],
  },
]

export const PACKAGE_GROUP_DETAILS: Record<
  PackageGroup,
  { title: string; description: string; skills: string[] }
> = {
  four_skill: {
    title: 'Gói 4 kỹ năng',
    description: 'Listening, Reading, Writing và Speaking trong cùng một gói luyện tập.',
    skills: ['Listening', 'Reading', 'Writing', 'Speaking'],
  },
  three_skill: {
    title: 'Gói 3 kỹ năng',
    description: 'Listening, Reading và Writing — dùng cho lộ trình thi LRW.',
    skills: ['Listening', 'Reading', 'Writing'],
  },
}

export function mergeProductCatalogGroups(
  groups: ProductCatalogGroup[] | undefined,
): ProductCatalogGroup[] {
  return PACKAGE_CATALOG_GROUPS.map((fallback) => {
    const incoming = groups?.find((group) => group.group === fallback.group)
    if (!incoming) return fallback

    return {
      ...fallback,
      ...incoming,
      label: incoming.label || fallback.label,
      products: incoming.products ?? [],
    }
  })
}

type LegacyCatalogProduct = Product & {
  product_kind?: string
  lrw_enabled?: boolean
  speaking_enabled?: boolean
}

function packageGroupFromLegacyProduct(product: LegacyCatalogProduct): PackageGroup | null {
  if (product.package_group === 'four_skill' || product.package_group === 'three_skill') {
    return product.package_group
  }

  if (product.product_kind !== 'package' || product.lrw_enabled !== true) {
    return null
  }

  return product.speaking_enabled ? 'four_skill' : 'three_skill'
}

function toCatalogProduct(product: LegacyCatalogProduct, packageGroup: PackageGroup): Product {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    price: product.price,
    package_group: packageGroup,
    validity_value: product.validity_value,
    validity_unit: product.validity_unit,
    thumbnail: product.thumbnail,
    features: product.features,
  }
}

function groupsFromLegacyProducts(products: LegacyCatalogProduct[] | undefined): ProductCatalogGroup[] {
  const grouped: Record<PackageGroup, Product[]> = {
    four_skill: [],
    three_skill: [],
  }

  for (const product of products ?? []) {
    const packageGroup = packageGroupFromLegacyProduct(product)
    if (!packageGroup) continue
    grouped[packageGroup].push(toCatalogProduct(product, packageGroup))
  }

  return mergeProductCatalogGroups(
    PACKAGE_CATALOG_GROUPS.map((group) => ({
      ...group,
      products: grouped[group.group],
    })),
  )
}

export function normalizeProductCatalogPayload(payload: unknown): ProductCatalogGroup[] {
  if (!payload || typeof payload !== 'object') {
    return mergeProductCatalogGroups([])
  }

  const record = payload as Record<string, unknown>
  const grouped = record.groups
  const hasGroupedProducts =
    Array.isArray(grouped) &&
    grouped.some(
      (group) =>
        typeof group === 'object' &&
        group !== null &&
        Array.isArray((group as ProductCatalogGroup).products) &&
        (group as ProductCatalogGroup).products.length > 0,
    )

  if (hasGroupedProducts) {
    return mergeProductCatalogGroups(grouped as ProductCatalogGroup[])
  }

  if (Array.isArray(record.products)) {
    return groupsFromLegacyProducts(record.products as LegacyCatalogProduct[])
  }

  return mergeProductCatalogGroups([])
}

export function formatPackageValidity(product: Pick<Product, 'validity_value' | 'validity_unit'>) {
  if (!product.validity_value || !product.validity_unit) {
    return 'Thời hạn theo quy định gói'
  }

  const unitLabel =
    product.validity_unit === 'month'
      ? 'tháng'
      : product.validity_unit === 'day'
        ? 'ngày'
        : product.validity_unit

  return `Hiệu lực ${product.validity_value} ${unitLabel}`
}

export function productKindLabel(product: Pick<Product, 'package_group'>): string {
  switch (product.package_group) {
    case 'four_skill':
      return 'Gói 4 kỹ năng'
    case 'three_skill':
      return 'Gói 3 kỹ năng'
    default:
      return 'Gói luyện tập'
  }
}
