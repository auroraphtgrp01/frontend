import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useVoucherInput, calculateDiscount } from '@/api/vouchers'
import { formatCurrency } from '@/lib/formatters'
import type { Voucher, VoucherApplicableScope } from '@/types/order'

interface VoucherInputProps {
  orderSubtotal: number
  applicableScope?: VoucherApplicableScope
  onApply?: (voucher: Voucher, discountAmount: number) => void
  onRemove?: () => void
  disabled?: boolean
  compact?: boolean
}

export function VoucherInput({
  orderSubtotal,
  applicableScope,
  onApply: _onApply,
  onRemove,
  disabled = false,
  compact = false,
}: VoucherInputProps) {
  const [inputCode, setInputCode] = useState('')
  const {
    isValidating,
    error,
    applyVoucher,
    removeVoucher,
    voucher,
    discountAmount,
    usageRemaining,
    userUsageRemaining,
    isValid,
  } = useVoucherInput((appliedVoucher, appliedDiscount) => {
    _onApply?.(appliedVoucher, appliedDiscount)
  })

  const handleApply = async () => {
    if (!inputCode.trim()) return

    await applyVoucher(inputCode, orderSubtotal, applicableScope)
  }

  const handleRemove = () => {
    removeVoucher()
    setInputCode('')
    onRemove?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    }
  }

  if (compact) {
    if (isValid && voucher) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="flex-1 text-sm font-medium text-green-800">
            {voucher.code}
          </span>
          <span className="text-sm text-green-600">
            -{formatCurrency(discountAmount)}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-green-600 hover:text-green-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Voucher code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={disabled || isValidating}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleApply}
            disabled={disabled || isValidating || !inputCode.trim()}
          >
            {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Enter voucher code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={disabled || isValidating || isValid}
            className={cn(
              'pr-20 font-mono uppercase',
              isValid && 'border-green-500 bg-green-50'
            )}
          />
          {isValidating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <Button
          onClick={handleApply}
          disabled={disabled || isValidating || !inputCode.trim() || isValid}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isValid ? (
            <Check className="h-4 w-4" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>

      {/* Success Message */}
      {isValid && voucher && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">
                  {voucher.code}
                </span>
              </div>
              <p className="mt-1 text-sm text-green-700">
                {voucher.type === 'percentage'
                  ? `${voucher.value}% off`
                  : `${formatCurrency(voucher.value)} off`}
                {' '}discount applied!
              </p>
              {discountAmount > 0 && (
                <p className="mt-1 text-sm font-medium text-green-800">
                  You save: {formatCurrency(discountAmount)}
                </p>
              )}
              {usageRemaining != null && (
                <p className="mt-1 text-sm text-green-700">
                  Remaining uses: {usageRemaining}
                  {userUsageRemaining != null ? ` (you: ${userUsageRemaining})` : ''}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-green-700 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}

// Helper for cn import
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Standalone discount calculator for use in forms
interface DiscountCalculatorProps {
  subtotal: number
  voucher: Voucher | null
}

export function DiscountCalculator({ subtotal, voucher }: DiscountCalculatorProps) {
  const { discountAmount, finalTotal } = calculateDiscount(subtotal, voucher)

  return (
    <div className="space-y-1 text-sm">
      {voucher && discountAmount > 0 && (
        <>
          <div className="flex justify-between text-green-600">
            <span>Discount ({voucher.code})</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(finalTotal)}</span>
          </div>
        </>
      )}
    </div>
  )
}

export default VoucherInput
