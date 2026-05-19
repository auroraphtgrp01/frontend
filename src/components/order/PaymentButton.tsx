import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/formatters'
import type { CreateOrderRequest } from '@/types/order'

interface PaymentButtonProps {
  onCreateOrder: (data: CreateOrderRequest) => Promise<{ payment_url?: string; order_id?: string } | void>
  orderData: CreateOrderRequest
  disabled?: boolean
  showVNPayLogo?: boolean
  showPayLaterOption?: boolean
  onPayLater?: () => void
}

export function PaymentButton({
  onCreateOrder,
  orderData,
  disabled = false,
  showVNPayLogo = true,
  showPayLaterOption = false,
  onPayLater,
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await onCreateOrder(orderData)
      console.log('[VNPay] Order created, redirecting to:', result)

      if (result?.payment_url) {
        console.log('[VNPay] Payment URL:', result.payment_url)
        // TEMP: Disable redirect for debugging
        // window.location.href = result.payment_url
      } else if (result?.order_id) {
        console.log('[VNPay] Order ID:', result.order_id)
        // TEMP: Disable redirect for debugging
        // window.location.href = `/app/orders/${result.order_id}`
      }
    } catch (err) {
      console.error('[VNPay] Error creating order:', err)
      setError(err instanceof Error ? err.message : 'Failed to create order')
      setShowDialog(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        className="w-full"
        size="lg"
        onClick={() => setShowDialog(true)}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {showVNPayLogo && (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            )}
            Pay with VNPay
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              You are about to pay {formatCurrency(orderData.total)} for your order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatCurrency(orderData.total)}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              You will be redirected to VNPay secure payment page to complete your transaction.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Order...
                </>
              ) : (
                'Continue to VNPay'
              )}
            </Button>
            {showPayLaterOption && onPayLater && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  onPayLater()
                }}
                disabled={isLoading}
                className="w-full"
              >
                Pay Later
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface PaymentButtonSimpleProps {
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  text?: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
}

export function PaymentButtonSimple({
  onClick,
  isLoading = false,
  disabled = false,
  text = 'Pay Now',
  variant = 'default',
  size = 'default',
}: PaymentButtonSimpleProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        text
      )}
    </Button>
  )
}

export default PaymentButton
