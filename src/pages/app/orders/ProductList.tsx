import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductCatalogSections } from '@/components/order/ProductCatalogSections'
import { useProducts } from '@/api/products'
import type { Product, ProductCatalogGroup } from '@/types/product'

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Newest First' },
  { value: 'created_at-asc', label: 'Oldest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
]

export default function ProductList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at-desc')

  const [sortField, sortOrder] = sortBy.split('-')

  const { data, isLoading, isError, error } = useProducts({
    search: search || undefined,
    sort_by: sortField as 'price' | 'name' | 'created_at',
    sort_order: sortOrder as 'asc' | 'desc',
  })

  const groups = (data?.groups || []) as ProductCatalogGroup[]

  const handleProductSelect = (product: Product) => {
    navigate(`/app/orders/new?product_id=${product.id}`)
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Không tải được gói luyện tập</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load products. Please try again.'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gói luyện tập</h1>
        <p className="mt-2 text-muted-foreground">
          Chọn gói luyện tập 4 kỹ năng hoặc 3 kỹ năng. Đăng ký lẻ L-R-W/Speaking tại{' '}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => navigate('/app/register')}
          >
            màn đăng ký lẻ
          </button>
          .
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ProductCatalogSections
        groups={groups}
        isLoading={isLoading}
        onSelect={handleProductSelect}
      />

    </div>
  )
}
