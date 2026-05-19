import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowRight, Loader2, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseVNPayCallback, isPaymentSuccessful, isPaymentPending } from '@/api/payments'
import { usePollOrderStatus } from '@/api/payments'
import { useOrder } from '@/api/orders'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge'

export default function PaymentCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    orderId?: string
  } | null>(null)

  // Parse VNPay callback params
  const callbackParams = parseVNPayCallback(searchParams)
  const orderId = callbackParams.order_id

  // Debug logging
  console.log('[VNPay Callback] searchParams:', searchParams.toString())
  console.log('[VNPay Callback] parsed callbackParams:', callbackParams)

  // Poll order status
  const { statusData, resetPolling } = usePollOrderStatus(orderId || '', {
    enabled: !!orderId && isProcessing,
    interval: 2000,
    maxAttempts: 30,
  })

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useOrder(orderId || '')

  useEffect(() => {
    // If no callback params, show error
    if (!searchParams.toString()) {
      setResult({
        success: false,
        message: 'No payment information found.',
      })
      setIsProcessing(false)
      return
    }

    // Check payment result from VNPay callback
    if (callbackParams.code) {
      if (isPaymentSuccessful(callbackParams)) {
        setResult({
          success: true,
          message: 'Payment successful! Thank you for your purchase.',
          orderId,
        })
      } else if (isPaymentPending(callbackParams)) {
        setResult({
          success: false,
          message: 'Payment is being processed. Please wait...',
          orderId,
        })
      } else {
        setResult({
          success: false,
          message: `Payment failed: ${callbackParams.message || 'Transaction was not completed'}`,
          orderId,
        })
      }
      setIsProcessing(false)
    }
  }, [searchParams, callbackParams, orderId])

  useEffect(() => {
    // If we get a status update, update the result
    if (statusData?.status) {
      if (statusData.status === 'paid' || statusData.status === 'completed') {
        setResult({
          success: true,
          message: 'Payment confirmed! Your order has been processed.',
          orderId: statusData.order_id,
        })
      } else if (statusData.status === 'failed') {
        setResult({
          success: false,
          message: statusData.message || 'Payment could not be completed.',
          orderId: statusData.order_id,
        })
      }
    }
  }, [statusData?.status, statusData?.order_id, statusData?.message])

  const handleRetry = () => {
    if (orderId) {
      navigate(`/app/orders/${orderId}`)
    } else {
      navigate('/app/orders')
    }
  }

  const handleRefresh = () => {
    resetPolling()
    setIsProcessing(true)
  }

  const isPackageOrder = order?.fulfillment_mode === 'package'

  // Render processing state
  if (isProcessing || orderLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Processing Payment...</h1>
          <p className="mt-2 text-muted-foreground">
            Please wait while we confirm your payment status.
          </p>
          {orderId && (
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              Order ID: {orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Render no params state
  if (!result) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">No Payment Information</h1>
          <p className="mt-2 text-muted-foreground">
            We couldn't find any payment information for this transaction.
          </p>
          <Button asChild className="mt-6">
            <Link to="/app/orders">
              Go to Orders
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Render success state
  if (result.success) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
          <p className="mt-2 text-muted-foreground">{result.message}</p>

          {/* Order Summary */}
          {order && (
            <div className="mt-6 rounded-lg border bg-card p-6 text-left">
              <h2 className="font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <OrderStatusBadge status={order.status} size="sm" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                {order.payment?.paid_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid At</span>
                    <span>{formatDate(order.payment.paid_at, 'datetime')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg">
              <Link to={isPackageOrder ? '/app/packages' : `/app/orders/${result.orderId}`}>
                {isPackageOrder ? 'Vào luyện thi' : 'View Order Details'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {isPackageOrder && (
              <Button variant="outline" asChild>
                <Link to={`/app/orders/${result.orderId}`}>
                  View Order Details
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/app/orders">
                Back to Orders
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render failure state
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-red-600">Payment Failed</h1>
        <p className="mt-2 text-muted-foreground">{result.message}</p>

        {result.orderId && (
          <div className="mt-4 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono font-medium">{result.orderId.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <Clock className="h-4 w-4" />
                <span>Pending</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {result.orderId && (
            <>
              <Button variant="outline" onClick={handleRefresh} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Check Again
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/app/orders/${result.orderId}`}>
                  View Order
                </Link>
              </Button>
            </>
          )}
          <Button onClick={handleRetry}>
            Try Again
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/app/orders">
              Back to Orders
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          If you believe this is an error, please contact our support team.
        </p>
      </div>
    </div>
  )
}
