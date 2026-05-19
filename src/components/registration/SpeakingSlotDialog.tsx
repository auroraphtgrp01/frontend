import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSlotAvailability } from '@/api/exambooking'
import {
  formatRegistrationDateShort,
  formatRegistrationSlotLabel,
  groupSpeakingSlotsByPeriod,
} from '@/lib/retail-registration'
import type { SlotAvailability } from '@/types/booking'

interface SpeakingSlotDialogProps {
  open: boolean
  date?: string
  selectedSlot: SlotAvailability | null
  onOpenChange: (open: boolean) => void
  onSelect: (slot: SlotAvailability) => void
}

export function SpeakingSlotDialog({
  open,
  date,
  selectedSlot,
  onOpenChange,
  onSelect,
}: SpeakingSlotDialogProps) {
  const slotParams = date ? { date, type: 'speaking' as const } : null
  const { data: slotData, isLoading } = useSlotAvailability(slotParams)
  const groups = groupSpeakingSlotsByPeriod(slotData?.slots ?? [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chọn ca thi Speaking</DialogTitle>
          <DialogDescription>
            {date
              ? `Ngày ${formatRegistrationDateShort(date)}`
              : 'Chọn ngày thi Speaking trước khi chọn ca.'}
          </DialogDescription>
        </DialogHeader>

        {!date ? (
          <p className="text-sm text-muted-foreground">Vui lòng chọn ngày thi Speaking trước.</p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có ca thi khả dụng cho ngày này.</p>
        ) : (
          <div className="max-h-[28rem] space-y-5 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.period}>
                <p className="mb-2 text-sm font-semibold text-foreground">{group.label}</p>
                <div className="space-y-2">
                  {group.slots.map((slot) => {
                    const isSelected = selectedSlot?.slot_id === slot.slot_id
                    return (
                      <button
                        key={slot.slot_id}
                        type="button"
                        onClick={() => {
                          onSelect(slot)
                          onOpenChange(false)
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                          isSelected
                            ? 'border-destructive bg-destructive/5'
                            : 'border-border hover:border-destructive/40',
                        )}
                      >
                        <span
                          className={cn(
                            'h-4 w-4 rounded-full border',
                            isSelected
                              ? 'border-destructive bg-destructive'
                              : 'border-muted-foreground/40',
                          )}
                        />
                        <span className="font-medium">{formatRegistrationSlotLabel(slot)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}