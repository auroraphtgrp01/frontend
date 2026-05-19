import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'
import { formatPackageValidity, productKindLabel } from '@/lib/package-catalog'
import type { Product } from '@/types/product'

interface ProductCardProps {
  product: Product
  isSelected?: boolean
  onSelect?: (product: Product) => void
  onViewDetails?: (product: Product) => void
  showSelectButton?: boolean
  compact?: boolean
}

const PRODUCT_TYPE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  four_skill: 'default',
  three_skill: 'secondary',
}

export function ProductCard({
  product,
  isSelected = false,
  onSelect,
  onViewDetails,
  showSelectButton = true,
  compact = false,
}: ProductCardProps) {
  const typeLabel = productKindLabel(product)

  if (compact) {
    return (
      <div
        className={`relative flex items-center gap-4 rounded-lg border p-4 transition-colors ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        {product.thumbnail && (
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
            <img
              src={product.thumbnail}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium truncate">{product.name}</h4>
              <p className="text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
            </div>
            {isSelected && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
        {showSelectButton && onSelect && (
          <Button
            size="sm"
            variant={isSelected ? 'outline' : 'default'}
            onClick={() => onSelect(product)}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:shadow-md'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-12 w-12 text-muted-foreground/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        )}

        {/* Type Badge */}
        <Badge
          variant={PRODUCT_TYPE_COLORS[product.package_group || 'default'] || 'default'}
          className="absolute left-2 top-2"
        >
          {typeLabel}
        </Badge>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Check className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold line-clamp-2">{product.name}</h3>

        {product.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}

        <p className="mt-3 text-sm text-muted-foreground">
          {formatPackageValidity(product)}
        </p>

        {/* Features */}
        {product.features && product.features.length > 0 && (
          <ul className="mt-3 space-y-1">
            {product.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                <span className="truncate">{feature}</span>
              </li>
            ))}
            {product.features.length > 3 && (
              <li className="text-sm text-muted-foreground">
                +{product.features.length - 3} more features
              </li>
            )}
          </ul>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
          </div>
          <div className="flex gap-2">
            {onViewDetails && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDetails(product)}
              >
                Details
              </Button>
            )}
            {showSelectButton && onSelect && (
              <Button
                size="sm"
                variant={isSelected ? 'outline' : 'default'}
                onClick={() => onSelect(product)}
              >
                {isSelected ? 'Selected' : 'Select'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ProductCardCompactSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Skeleton className="h-16 w-16 flex-shrink-0 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export default ProductCard
