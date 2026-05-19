import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { VoucherInput } from '@/components/order/VoucherInput'
import { Loader2 } from 'lucide-react'
import type { Voucher } from '@/types/order'

interface RegistrationPaymentSectionProps {
  subtotal: number
  discount: number
  total: number
  isSubmitting: boolean
  disabled?: boolean
  submitHint?: string
  onSubmit: () => void
  onApplyVoucher: (voucher: Voucher, discountAmount: number) => void
  onRemoveVoucher: () => void
}

export function RegistrationPaymentSection({
  subtotal,
  discount,
  total,
  isSubmitting,
  disabled = false,
  submitHint,
  onSubmit,
  onApplyVoucher,
  onRemoveVoucher,
}: RegistrationPaymentSectionProps) {
  return (
    <section className="rounded-xl border bg-muted/20 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-foreground">Thanh toán phí thi</h2>

      <div className="mt-4 space-y-2">
        <Label>Mã voucher</Label>
        <VoucherInput
          orderSubtotal={subtotal}
          applicableScope="retail"
          onApply={onApplyVoucher}
          onRemove={onRemoveVoucher}
          compact
        />
        <p className="text-xs text-muted-foreground">
          Voucher được kiểm tra theo phí thi L-R-W trước khi tạo đơn thanh toán.
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p>Thanh toán Online qua (VNPay)</p>
        <p>Chuyển khoản ngân hàng</p>
        <p>
          Thanh toán online được xác nhận tự động 24/7. Nếu gặp sự cố, vui lòng liên hệ hỗ trợ.
        </p>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between text-green-600">
            <span>Giảm giá voucher</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t pt-2 text-base">
          <span className="font-medium">Thanh toán</span>
          <span className="font-bold text-destructive">{formatCurrency(total)}</span>
        </div>
      </div>

      {submitHint ? (
        <p className="mt-4 text-sm text-muted-foreground">{submitHint}</p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="mt-5 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={onSubmit}
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          `Thanh toán ${formatCurrency(total)}`
        )}
      </Button>
    </section>
  )
}
