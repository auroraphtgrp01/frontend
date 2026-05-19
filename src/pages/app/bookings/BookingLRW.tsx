import { useEffect, useState } from 'react'
import { Check, Loader2, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateSlotPicker } from '@/components/booking/DateSlotPicker'
import { useSlotAvailability, useAvailableDates } from '@/api/exambooking'
import { useBookLRW } from '@/api/exambooking'
import type { BookingWizardState, SlotAvailability, BookingResponse } from '@/types/booking'

interface BookingLRWProps {
  wizardState: BookingWizardState
  onDateSelect: (date: string) => void
  onSlotSelect: (slot: SlotAvailability) => void
  onBookingComplete: (result: BookingResponse) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function BookingLRW({
  wizardState,
  onDateSelect,
  onSlotSelect,
  onBookingComplete,
}: BookingLRWProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null)

  // Fetch available dates for LRW
  const { data: availableDates = [], isLoading: isLoadingDates } = useAvailableDates('lrw')

  // Fetch slots when date is selected
  const slotParams = wizardState.lrwDate
    ? { date: wizardState.lrwDate, type: 'lrw' as const }
    : null
  const { data: slotData, isLoading: isLoadingSlots } = useSlotAvailability(slotParams)

  const bookLRW = useBookLRW()

  // Update selected slot when wizardState changes
  useEffect(() => {
    if (wizardState.lrwTimeSlot && slotData?.slots) {
      const slot = slotData.slots.find((s) => s.slot_id === wizardState.lrwTimeSlot)
      if (slot) {
        setSelectedSlot(slot)
      }
    } else {
      setSelectedSlot(null)
    }
  }, [wizardState.lrwTimeSlot, slotData])

  const handleSlotSelect = (slot: SlotAvailability) => {
    setSelectedSlot(slot)
    onSlotSelect(slot)
  }

  const handleDateSelect = (date: string) => {
    setSelectedSlot(null)
    onDateSelect(date)
  }

  const handleConfirm = async () => {
    if (!wizardState.orderId || !wizardState.lrwDate || !wizardState.lrwTimeSlot) {
      return
    }

    try {
      const result = await bookLRW.mutateAsync({
        order_id: Number(wizardState.orderId),
        selected_date: wizardState.lrwDate,
        time_slot: wizardState.lrwTimeSlot,
        teacher_id: wizardState.lrwTeacherId ? Number(wizardState.lrwTeacherId) : undefined,
      })
      onBookingComplete(result)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isStep1 = wizardState.currentStep === 1
  const isStep2 = wizardState.currentStep === 2
  const isStep3 = wizardState.currentStep === 3

  return (
    <div className="space-y-6">
      {/* Step 1: Select Date */}
      {isStep1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Step 1: Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DateSlotPicker
              availableDates={availableDates}
              slots={slotData?.slots || []}
              selectedDate={wizardState.lrwDate}
              selectedSlot={wizardState.lrwTimeSlot}
              onDateSelect={handleDateSelect}
              onSlotSelect={handleSlotSelect}
              isLoadingDates={isLoadingDates}
              isLoadingSlots={isLoadingSlots}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Time Slot */}
      {isStep2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Step 2: Review Your Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {wizardState.lrwDate && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Selected Date</p>
                  <p className="font-semibold">{formatDate(wizardState.lrwDate)}</p>
                </div>
              </div>
            )}

            {selectedSlot && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Selected Time Slot</p>
                  <p className="font-semibold">
                    {formatTime(selectedSlot.start_time)} — {formatTime(selectedSlot.end_time)}
                  </p>
                  {selectedSlot.teacher_name && (
                    <p className="text-sm text-muted-foreground">
                      Teacher: {selectedSlot.teacher_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Listening/Reading/Writing Exam</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Duration: Approximately 2.5 hours
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Listening: 30 minutes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Reading: 60 minutes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Writing: 60 minutes
                </li>
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirm}
              disabled={bookLRW.isPending}
            >
              {bookLRW.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  Confirm Booking
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {isStep3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Booking Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your LRW exam has been booked successfully. You will receive a confirmation email shortly.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
