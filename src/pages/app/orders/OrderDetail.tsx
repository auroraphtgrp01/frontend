import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, CreditCard, FileText, Package, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { OrderAppointmentGroup } from '@/components/appointment/OrderAppointmentGroup'
import { OrderStatusBadge, OrderStatusTimeline } from '@/components/order/OrderStatusBadge'
import { useOrder, useCancelOrder } from '@/api/orders'
import { useResumeOrderPayment } from '@/api/entitlements'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { isOrderPaymentAvailable, isOrderPaymentExpired } from '@/lib/order-payment'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError, error, refetch } = useOrder(id!)
  const cancelOrder = useCancelOrder()
  const resumePayment = useResumeOrderPayment()

  useEffect(() => {
    if (order?.status === 'pending') {
      const interval = setInterval(() => {
        refetch()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [order?.status, refetch])

  const handleCancelOrder = async () => {
    if (!id) return

    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return
    }

    try {
      await cancelOrder.mutateAsync(id)
      toast.success('Order cancelled', {
        description: 'Your order has been cancelled successfully.',
      })
    } catch {
      toast.error('Failed to cancel order', {
        description: 'Please try again or contact support.',
      })
    }
  }

  const handlePayNow = async () => {
    if (!id || !order || !isOrderPaymentAvailable(order)) {
      toast.error('Payment hold expired', {
        description: 'This order is no longer payable. Please place a new order.',
      })
      return
    }
    try {
      const result = await resumePayment.mutateAsync(id)
      if (result.vnp_url) {
        window.location.href = result.vnp_url
        return
      }
      toast.error('Payment URL unavailable', {
        description: 'The payment hold may have expired.',
      })
    } catch {
      toast.error('Failed to resume payment', {
        description: 'Please try again or contact support.',
      })
    }
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Error loading order</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load order details. Please try again.'}
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
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Order Details</h1>
                {order && <OrderStatusBadge status={order.status} size="md" />}
              </div>
              {order && (
                <p className="mt-1 text-sm text-muted-foreground font-mono">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
          </div>

          {order && (
            <div className="flex items-center gap-2">
              {order && isOrderPaymentAvailable(order) && (
                <>
                  <Button variant="outline" onClick={handlePayNow} disabled={resumePayment.isPending}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelOrder}
                    disabled={cancelOrder.isPending}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${cancelOrder.isPending ? 'animate-spin' : ''}`} />
                    Cancel Order
                  </Button>
                </>
              )}
              {order && isOrderPaymentExpired(order) && (
                <p className="text-sm text-muted-foreground">
                  Payment window expired. This order has been cancelled.
                </p>
              )}
              {order.status === 'completed' && (
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Download Invoice
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Status Card */}
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <h2 className="font-semibold">Order Status</h2>
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
                    {order.payment_deadline_at && order.status === 'pending' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pay before</span>
                        <span>{formatDate(order.payment_deadline_at, 'datetime')}</span>
                      </div>
                    )}
                    {order.fulfillment_mode && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fulfillment</span>
                        <span className="capitalize">{order.fulfillment_mode.replace('_', ' ')}</span>
                      </div>
                    )}
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

                {/* Order Summary */}
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

            {/* Schedule Details */}
            {(order.appointments?.length ?? 0) > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Lịch thi của đơn này
                </h2>
                <OrderAppointmentGroup
                  orderId={order.id}
                  orderStatus={order.status}
                  orderTotal={order.total}
                  orderCreatedAt={order.created_at}
                  appointments={order.appointments ?? []}
                />
              </div>
            )}

            {/* Payment Details */}
            {order.payment && (
              <div className="rounded-lg border bg-card">
                <div className="border-b p-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment
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
                    <span className={order.payment.status === 'completed' ? 'text-green-600' : ''}>
                      {order.payment.status}
                    </span>
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
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="rounded-lg border bg-card">
                <div className="border-b p-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h2>
                </div>
                <div className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            )}

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
    </div>
  )
}

