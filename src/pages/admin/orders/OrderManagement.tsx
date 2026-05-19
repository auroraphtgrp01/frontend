import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Package,
  RefreshCw,
  CheckCircle,
  User,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { OrderStatusBadge, OrderStatusTimeline } from '@/components/order/OrderStatusBadge'
import { useAdminOrder, useAdminUpdateOrder, useAdminRefundOrder } from '@/api/orders'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { OrderStatus } from '@/types/order'

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const CANCELLABLE_STATUSES: OrderStatus[] = ['pending']

export default function OrderManagement() {
  const { id } = useParams<{ id: string }>()

  const [notes, setNotes] = useState('')
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('')

  const { data: order, isLoading, isError, error } = useAdminOrder(id!)
  const updateOrder = useAdminUpdateOrder()
  const refundOrder = useAdminRefundOrder()

  const canUpdateStatus = order && ['paid', 'processing'].includes(order.status)
  const canRefund = order && ['paid', 'completed'].includes(order.status)
  const canCancel = order && CANCELLABLE_STATUSES.includes(order.status)

  const handleUpdateStatus = async () => {
    if (!id || !newStatus) return

    try {
      await updateOrder.mutateAsync({ orderId: id, data: { status: newStatus } })
      toast.success('Status updated', {
        description: `Order status has been updated to ${newStatus}`,
      })
      setShowStatusDialog(false)
      setNewStatus('')
    } catch {
      toast.error('Failed to update status', {
        description: 'Please try again',
      })
    }
  }

  const handleRefund = async () => {
    if (!id) return

    try {
      await refundOrder.mutateAsync({ orderId: id, reason: refundReason })
      toast.success('Refund processed', {
        description: 'The refund has been processed successfully.',
      })
      setShowRefundDialog(false)
      setRefundReason('')
    } catch {
      toast.error('Failed to process refund', {
        description: 'Please try again',
      })
    }
  }

  const handleUpdateNotes = async () => {
    if (!id) return

    try {
      await updateOrder.mutateAsync({ orderId: id, data: { notes } })
      toast.success('Notes updated')
    } catch {
      toast.error('Failed to update notes')
    }
  }

  const handleCancelOrder = async () => {
    if (!id) return
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    try {
      await updateOrder.mutateAsync({ orderId: id, data: { status: 'cancelled' } })
      toast.success('Order cancelled')
    } catch {
      toast.error('Failed to cancel order')
    }
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Error loading order</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load order. Please try again.'}
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
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Order Management</h1>
                {order && <OrderStatusBadge status={order.status} size="md" />}
              </div>
              {order && (
                <p className="mt-1 text-sm text-muted-foreground font-mono">
                  #{order.id}
                </p>
              )}
            </div>
          </div>

          {order && (
            <div className="flex items-center gap-2">
              {canUpdateStatus && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewStatus(order.status)
                    setShowStatusDialog(true)
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
              )}
              {canRefund && (
                <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Refund
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Process Refund</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to refund this order? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="rounded-lg bg-muted p-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Order Total</span>
                          <span className="font-semibold">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="refund-reason">Reason (Optional)</Label>
                        <Textarea
                          id="refund-reason"
                          placeholder="Enter reason for refund..."
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRefund}
                        disabled={refundOrder.isPending}
                      >
                        {refundOrder.isPending ? 'Processing...' : 'Process Refund'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancelOrder}
                  disabled={updateOrder.isPending}
                >
                  Cancel Order
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-60 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Order Status
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <OrderStatusTimeline status={order.status} />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Order ID</span>
                      <span className="font-mono">{order.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(order.created_at, 'datetime')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span>{formatDate(order.updated_at, 'datetime')}</span>
                    </div>
                    {order.payment?.paid_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid At</span>
                        <span className="text-green-600">
                          {formatDate(order.payment.paid_at, 'datetime')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h2>
              </div>
              <div className="p-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{order.user_name || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{order.user_email || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{order.user_id}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Academy</p>
                  <div className="flex items-center gap-2">
                    {order.academy_name ? (
                      <Badge variant="outline">{order.academy_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </h2>
              </div>
              <div className="p-4">
                {order.products && order.products.length > 0 ? (
                  <div className="space-y-4">
                    {order.products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {product.thumbnail && (
                            <img
                              src={product.thumbnail}
                              alt={product.name}
                              className="h-16 w-16 rounded-md object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.quantity} x {formatCurrency(product.price)}
                            </p>
                          </div>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(product.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No products found</p>
                )}

                <Separator className="my-4" />

                <div className="space-y-2">
                  {order.subtotal !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                  )}
                  {order.discount && order.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule */}
            {(order.selected_date || order.selected_date_from || order.time_slot) && (
              <div className="rounded-lg border bg-card">
                <div className="border-b p-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {order.selected_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span>{formatDate(order.selected_date, 'full')}</span>
                    </div>
                  )}
                  {order.selected_date_from && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Start Date</span>
                      <span>{formatDate(order.selected_date_from, 'full')}</span>
                    </div>
                  )}
                  {order.selected_date_to && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">End Date</span>
                      <span>{formatDate(order.selected_date_to, 'full')}</span>
                    </div>
                  )}
                  {order.time_slot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time Slot</span>
                      <span>{order.time_slot}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment */}
            {order.payment && (
              <div className="rounded-lg border bg-card">
                <div className="border-b p-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Details
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <span>{order.payment.provider}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{formatCurrency(order.payment.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={order.payment.status === 'completed' ? 'success' : 'secondary'}>
                      {order.payment.status}
                    </Badge>
                  </div>
                  {order.payment.transaction_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transaction ID</span>
                      <span className="font-mono text-xs">{order.payment.transaction_id}</span>
                    </div>
                  )}
                  {order.payment.paid_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid At</span>
                      <span>{formatDate(order.payment.paid_at, 'datetime')}</span>
                    </div>
                  )}
                  {order.payment.raw_response && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Raw Response</p>
                      <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
                        {JSON.stringify(order.payment.raw_response, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h2>
              </div>
              <div className="p-4">
                <Textarea
                  placeholder="Add notes about this order..."
                  value={notes || order.notes || ''}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={handleUpdateNotes}
                  disabled={updateOrder.isPending || notes === (order.notes || '')}
                >
                  Save Notes
                </Button>
              </div>
            </div>

            {/* Voucher */}
            {order.voucher_code && (
              <div className="rounded-lg border bg-card">
                <div className="border-b p-4">
                  <h2 className="font-semibold">Voucher Applied</h2>
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Code</span>
                    <span className="font-mono font-medium">{order.voucher_code}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Select the new status for this order.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={!newStatus || updateOrder.isPending}
            >
              {updateOrder.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
