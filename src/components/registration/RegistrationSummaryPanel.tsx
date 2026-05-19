import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import {
  formatRegistrationDateShort,
  formatRegistrationSlotLabel,
  selectedWritingFeedbackLabels,
} from '@/lib/retail-registration'
import type { SlotAvailability } from '@/types/booking'
import type { WritingFeedbackMode } from '@/types/product'

interface RegistrationSummaryPanelProps {
  lrwDate?: string
  lrwSlot: SlotAvailability | null
  speakingDate?: string
  speakingSlot: SlotAvailability | null
  writingAddons: Record<WritingFeedbackMode, boolean>
  subtotal: number
  discount: number
  total: number
  canSubmit: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

export function RegistrationSummaryPanel({
  lrwDate,
  lrwSlot,
  speakingDate,
  speakingSlot,
  writingAddons,
  subtotal,
  discount,
  total,
  canSubmit,
  isSubmitting,
  onSubmit,
}: RegistrationSummaryPanelProps) {
  const feedbackLabels = selectedWritingFeedbackLabels(writingAddons)

  return (
    <aside className="rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-6">
      <h2 className="text-lg font-semibold text-foreground">Chi tiết đăng ký</h2>

      <div className="mt-5 space-y-4 text-sm">
        <SummaryRow
          label="Thi L-R-W"
          value={
            lrwDate && lrwSlot
              ? `${formatRegistrationDateShort(lrwDate)}, ${formatRegistrationSlotLabel(lrwSlot)}`
              : 'Chưa chọn lịch'
          }
        />
        <SummaryRow
          label="Thi Speaking"
          value={
            speakingDate
              ? speakingSlot
                ? `${formatRegistrationDateShort(speakingDate)}, ${formatRegistrationSlotLabel(speakingSlot)}`
                : formatRegistrationDateShort(speakingDate)
              : 'Chưa chọn lịch'
          }
        />
        <SummaryRow label="Test Format" value="Online" />
        <SummaryRow label="Test Module" value="Academic" />
        <SummaryRow label="Examiner" value="Native Speakers" />
        <SummaryRow
          label="Feedback Writing chi tiết"
          value={feedbackLabels.length > 0 ? feedbackLabels.join(', ') : 'Không chọn'}
        />
      </div>

      <div className="mt-6 space-y-2 border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between text-sm text-green-600">
            <span>Giảm giá voucher</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Tổng tiền</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(total)}</p>
        </div>
        <Button
          type="button"
          className="mt-2 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Đang xử lý...' : `Thanh toán ${formatCurrency(total)}`}
        </Button>
      </div>
    </aside>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
