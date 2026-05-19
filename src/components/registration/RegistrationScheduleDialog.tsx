import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DateSlotPicker } from '@/components/booking/DateSlotPicker'
import { useAvailableDates, useSlotAvailability } from '@/api/exambooking'
import type { SlotAvailability } from '@/types/booking'

type ScheduleKind = 'lrw' | 'speaking'
type PickerStep = 'date' | 'slot'

interface RegistrationScheduleDialogProps {
  open: boolean
  kind: ScheduleKind
  title: string
  selectedDate?: string
  selectedSlot: SlotAvailability | null
  onOpenChange: (open: boolean) => void
  onConfirm: (date: string, slot: SlotAvailability) => void
}

export function RegistrationScheduleDialog({
  open,
  kind,
  title,
  selectedDate,
  selectedSlot,
  onOpenChange,
  onConfirm,
}: RegistrationScheduleDialogProps) {
  const [step, setStep] = useState<PickerStep>('date')
  const [draftDate, setDraftDate] = useState<string | undefined>(selectedDate)
  const [draftSlot, setDraftSlot] = useState<SlotAvailability | null>(selectedSlot)

  useEffect(() => {
    if (!open) return
    setStep(selectedDate ? 'slot' : 'date')
    setDraftDate(selectedDate)
    setDraftSlot(selectedSlot)
  }, [open, selectedDate, selectedSlot])

  const { data: availableDates = [], isLoading: isLoadingDates } = useAvailableDates(kind)
  const slotParams = draftDate ? { date: draftDate, type: kind } : null
  const { data: slotData, isLoading: isLoadingSlots } = useSlotAvailability(slotParams)

  const handleDateSelect = (date: string) => {
    setDraftDate(date)
    setDraftSlot(null)
    setStep('slot')
  }

  const handleSlotSelect = (slot: SlotAvailability) => {
    setDraftSlot(slot)
  }

  const handleConfirm = () => {
    if (!draftDate || !draftSlot) return
    onConfirm(draftDate, draftSlot)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Chọn ngày và ca thi phù hợp với lịch của bạn.</DialogDescription>
        </DialogHeader>

        <DateSlotPicker
          availableDates={availableDates}
          slots={slotData?.slots || []}
          selectedDate={draftDate}
          selectedSlot={draftSlot?.slot_id}
          onDateSelect={handleDateSelect}
          onSlotSelect={handleSlotSelect}
          isLoadingDates={isLoadingDates}
          isLoadingSlots={isLoadingSlots}
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!draftDate || !draftSlot}
          >
            {step === 'date' && !draftDate ? 'Chọn ngày' : 'Xác nhận ca thi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
