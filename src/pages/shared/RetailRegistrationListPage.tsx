import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Eye, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge'
import { useAdminRetailRegistrations, useRetailRegistrations } from '@/api/orders'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { ROLES } from '@/lib/constants'
import type { Order, OrderStatus } from '@/types/order'

const STATUS_FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'refunded', label: 'Hoàn tiền' },
  { value: 'cancelled', label: 'Đã hủy' },
]

type RetailRegistrationListPageProps = {
  scope: 'learner' | 'academy_admin'
}

export default function RetailRegistrationListPage({ scope }: RetailRegistrationListPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdminScope =
    scope === 'academy_admin' ||
    user?.role === ROLES.ACADEMY_ADMIN ||
    user?.role === ROLES.SYSTEM_ADMIN

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const queryParams = {
    page,
    per_page: pageSize,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  }

  const learnerQuery = useRetailRegistrations(queryParams)
  const adminQuery = useAdminRetailRegistrations(queryParams)
  const activeQuery = isAdminScope ? adminQuery : learnerQuery

  const { data, isLoading, isError } = activeQuery
  const orders = (data?.data || []) as Order[]
  const meta = data?.meta

  const detailPath = (orderId: string) =>
    isAdminScope ? `/admin/orders/${orderId}` : `/app/orders/${orderId}`

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Không tải được danh sách</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Không thể tải danh sách đăng ký lẻ. Vui lòng thử lại.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">DS ĐK Lẻ</h1>
        <p className="mt-2 text-muted-foreground">
          {isAdminScope
            ? 'Danh sách đăng ký thi lẻ trong academy'
            : 'Các đơn đăng ký thi lẻ của bạn'}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isAdminScope ? 'Tìm theo mã đơn (UUID)...' : 'Tìm theo mã đơn...'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as OrderStatus | 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {meta && (
        <p className="mb-4 text-sm text-muted-foreground">
          Hiển thị {orders.length} / {meta.total} đăng ký
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Chưa có đăng ký lẻ</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search || statusFilter !== 'all'
              ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm'
              : 'Chưa có đơn đăng ký thi lẻ nào'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                {isAdminScope && <TableHead>Học viên</TableHead>}
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Tổng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  {isAdminScope && (
                    <TableCell>
                      <p className="font-medium">{order.user_name || '—'}</p>
                      {order.user_email && (
                        <p className="text-xs text-muted-foreground">{order.user_email}</p>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {(order.products || [])
                      .map((p) => p.name)
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{formatDate(order.created_at, 'short')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(detailPath(order.id))}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {meta.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  )
}
