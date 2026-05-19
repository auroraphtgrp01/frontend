import { Package, PenLine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProductCard, ProductCardSkeleton } from '@/components/order/ProductCard'
import {
  mergeProductCatalogGroups,
  PACKAGE_GROUP_DETAILS,
} from '@/lib/package-catalog'
import type { Product, ProductCatalogGroup } from '@/types/product'

interface ProductCatalogSectionsProps {
  groups: ProductCatalogGroup[]
  isLoading?: boolean
  selectedProductId?: string
  onSelect?: (product: Product) => void
  onViewDetails?: (product: Product) => void
  showSelectButton?: boolean
  loadingCount?: number
}

const GROUP_ICONS = {
  four_skill: Package,
  three_skill: PenLine,
} as const

export function ProductCatalogSections({
  groups,
  isLoading = false,
  selectedProductId,
  onSelect,
  onViewDetails,
  showSelectButton = true,
  loadingCount = 4,
}: ProductCatalogSectionsProps) {
  const catalogGroups = mergeProductCatalogGroups(groups)

  if (isLoading) {
    return (
      <div className="space-y-8">
        {catalogGroups.map((group) => (
          <section key={group.group} className="rounded-2xl border bg-card p-6">
            <div className="mb-6 space-y-2">
              <div className="h-7 w-48 rounded bg-muted" />
              <div className="h-4 w-full max-w-2xl rounded bg-muted" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: loadingCount }).map((_, index) => (
                <ProductCardSkeleton key={`${group.group}-${index}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {catalogGroups.map((group) => {
        const details = PACKAGE_GROUP_DETAILS[group.group]
        const Icon = GROUP_ICONS[group.group]

        return (
          <section
            key={group.group}
            className="rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{details.title}</h2>
                    <p className="text-sm text-muted-foreground">{details.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {details.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <Badge variant="outline">
                {group.products.length} gói
              </Badge>
            </div>

            {group.products.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {group.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedProductId === product.id}
                    onSelect={onSelect}
                    onViewDetails={onViewDetails}
                    showSelectButton={showSelectButton}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                <p className="font-medium">Chưa có gói nào trong nhóm này</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Catalog hiện chưa có SKU gói phù hợp, hoặc gói đang tắt bán.
                </p>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
