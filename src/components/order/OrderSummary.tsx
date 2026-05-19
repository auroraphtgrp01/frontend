import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatters'
import type { OrderProduct, Voucher } from '@/types/order'

interface OrderSummaryProps {
  products: OrderProduct[]
  subtotal: number
  discount?: number
  voucher?: Voucher | null
  total: number
  onApplyVoucher?: () => void
  onRemoveVoucher?: () => void
  onProceedToPayment?: () => void
  isLoading?: boolean
  showPaymentButton?: boolean
  paymentButtonText?: string
  disabled?: boolean
}

export function OrderSummary({
  products,
  subtotal,
  discount = 0,
  voucher,
  total,
  onApplyVoucher,
  onRemoveVoucher,
  onProceedToPayment,
  isLoading = false,
  showPaymentButton = true,
  paymentButtonText = 'Proceed to Payment',
  disabled = false,
}: OrderSummaryProps) {
  const hasProducts = products.length > 0

  const productSummary = useMemo(() => {
    if (products.length === 1) {
      return products[0].name
    }
    return `${products[0].name} +${products.length - 1} more item${products.length > 2 ? 's' : ''}`
  }, [products])

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h3 className="font-semibold">Order Summary</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Products */}
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex justify-between text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-muted-foreground">
                  {product.quantity} x {formatCurrency(product.price)}
                </p>
              </div>
              <p className="font-medium whitespace-nowrap ml-4">
                {formatCurrency(product.subtotal)}
              </p>
            </div>
          ))}
        </div>

        {products.length > 1 && (
          <p className="text-sm text-muted-foreground truncate">
            {productSummary}
          </p>
        )}

        {/* Divider */}
        <div className="border-t" />

        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <p className="text-muted-foreground">Subtotal</p>
          <p>{formatCurrency(subtotal)}</p>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <p>Discount {voucher && `(${voucher.code})`}</p>
            <p>-{formatCurrency(discount)}</p>
          </div>
        )}

        {/* Voucher Applied */}
        {voucher && (
          <div className="flex items-center justify-between rounded-md bg-green-50 p-3 text-sm">
            <div>
              <p className="font-medium text-green-800">
                Voucher: {voucher.code}
              </p>
              <p className="text-green-600">
                {voucher.type === 'percentage'
                  ? `${voucher.value}% off`
                  : `${formatCurrency(voucher.value)} off`}
              </p>
            </div>
            {onRemoveVoucher && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemoveVoucher}
                className="text-green-700 hover:text-green-800 hover:bg-green-100"
              >
                Remove
              </Button>
            )}
          </div>
        )}

        {/* Apply Voucher Button */}
        {!voucher && onApplyVoucher && (
          <Button
            variant="outline"
            size="sm"
            onClick={onApplyVoucher}
            className="w-full"
          >
            Have a voucher code?
          </Button>
        )}

        {/* Divider */}
        <div className="border-t" />

        {/* Total */}
        <div className="flex justify-between">
          <p className="font-semibold">Total</p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Payment Button */}
      {showPaymentButton && onProceedToPayment && (
        <div className="border-t p-4">
          <Button
            className="w-full"
            size="lg"
            onClick={onProceedToPayment}
            disabled={disabled || isLoading || !hasProducts}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              paymentButtonText
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

interface OrderSummarySimpleProps {
  subtotal: number
  discount?: number
  total: number
  itemCount?: number
}

export function OrderSummarySimple({
  subtotal,
  discount = 0,
  total,
  itemCount = 0,
}: OrderSummarySimpleProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})
        </span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Discount</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold text-lg pt-2 border-t">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

export default OrderSummary
