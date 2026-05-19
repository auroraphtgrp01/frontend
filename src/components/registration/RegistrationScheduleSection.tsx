import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatRegistrationDateLabel, formatRegistrationSlotLabel } from '@/lib/retail-registration'
import type { SlotAvailability } from '@/types/booking'

interface RegistrationScheduleSectionProps {
  title: string
  date?: string
  slot: SlotAvailability | null
  datePlaceholder?: string
  slotPlaceholder?: string
  sessionPrefix?: string
  onReselectDate: () => void
  onReselectSlot: () => void
  className?: string
}

export function RegistrationScheduleSection({
  title,
  date,
  slot,
  datePlaceholder = 'Chọn ngày thi',
  slotPlaceholder = 'Chọn thời gian thi',
  sessionPrefix,
  onReselectDate,
  onReselectSlot,
  className,
}: RegistrationScheduleSectionProps) {
  const slotLabel = formatRegistrationSlotLabel(slot, slotPlaceholder)
  const sessionValue = sessionPrefix
    ? `${sessionPrefix} ${slotLabel}`
    : slot
      ? slotLabel
      : slotPlaceholder

  return (
    <section className={cn('rounded-xl border bg-muted/20 p-4 sm:p-5', className)}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>

      <div className="mt-4 space-y-3">
        <ScheduleField
          label={date ? formatRegistrationDateLabel(date) : datePlaceholder}
          onReselect={onReselectDate}
          isPlaceholder={!date}
        />
        <ScheduleField
          label={sessionValue}
          onReselect={onReselectSlot}
          isPlaceholder={!slot}
        />
      </div>
    </section>
  )
}

function ScheduleField({
  label,
  onReselect,
  isPlaceholder,
}: {
  label: string
  onReselect: () => void
  isPlaceholder: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
      <p
        className={cn(
          'min-w-0 flex-1 text-sm sm:text-base',
          isPlaceholder ? 'text-muted-foreground' : 'font-medium text-foreground',
        )}
      >
        {label}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onReselect}>
        Chọn lại
      </Button>
    </div>
  )
}
