import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_WRITING_ADDON_PRICE } from '@/lib/retail-registration'
import { formatCurrency } from '@/lib/formatters'
import type { RetailRegistrationProduct, WritingFeedbackMode } from '@/types/product'

interface WritingFeedbackAddonPickerProps {
  addons: RetailRegistrationProduct[]
  selected: Record<WritingFeedbackMode, boolean>
  onToggle: (mode: WritingFeedbackMode) => void
}

const ADDON_LABELS: Record<WritingFeedbackMode, string> = {
  task1: 'Writing Task 1',
  task2: 'Writing Task 2',
}

export function WritingFeedbackAddonPicker({
  addons,
  selected,
  onToggle,
}: WritingFeedbackAddonPickerProps) {
  return (
    <section className="rounded-xl border bg-muted/20 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Chọn Feedback Writing chi tiết</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          (Khuyến khích nên chọn để được sửa lỗi sai)
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(['task1', 'task2'] as WritingFeedbackMode[]).map((mode) => {
          const addon = addons.find(
            (item) => item.writing_feedback === mode || item.role === mode,
          )
          const price = addon?.price ?? DEFAULT_WRITING_ADDON_PRICE
          const isSelected = selected[mode]

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onToggle(mode)}
              className={cn(
                'relative rounded-xl border bg-background p-4 text-left transition-colors',
                isSelected
                  ? 'border-destructive ring-1 ring-destructive/40'
                  : 'border-border hover:border-destructive/40',
              )}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <p className="pr-8 text-sm font-semibold text-foreground">{ADDON_LABELS[mode]}</p>
              <p className="mt-2 text-sm font-medium text-destructive">
                +{formatCurrency(price)}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
