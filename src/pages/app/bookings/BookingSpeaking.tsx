import { useEffect, useState } from 'react'
import { Check, Loader2, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateSlotPicker } from '@/components/booking/DateSlotPicker'
import { useSlotAvailability, useAvailableDates } from '@/api/exambooking'
import { useBookSpeaking } from '@/api/exambooking'
import type { BookingWizardState, SlotAvailability, BookingResponse } from '@/types/booking'

interface BookingSpeakingProps {
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

export function BookingSpeaking({
  wizardState,
  onDateSelect,
  onSlotSelect,
  onBookingComplete,
}: BookingSpeakingProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null)

  // Fetch available dates for Speaking
  const { data: availableDates = [], isLoading: isLoadingDates } = useAvailableDates('speaking')

  // Fetch slots when date is selected
  const slotParams = wizardState.speakingDate
    ? { date: wizardState.speakingDate, type: 'speaking' as const }
    : null
  const { data: slotData, isLoading: isLoadingSlots } = useSlotAvailability(slotParams)

  const bookSpeaking = useBookSpeaking()

  // Update selected slot when wizardState changes
  useEffect(() => {
    if (wizardState.speakingTimeSlot && slotData?.slots) {
      const slot = slotData.slots.find((s) => s.slot_id === wizardState.speakingTimeSlot)
      if (slot) {
        setSelectedSlot(slot)
      }
    } else {
      setSelectedSlot(null)
    }
  }, [wizardState.speakingTimeSlot, slotData])

  const handleSlotSelect = (slot: SlotAvailability) => {
    setSelectedSlot(slot)
    onSlotSelect(slot)
  }

  const handleDateSelect = (date: string) => {
    setSelectedSlot(null)
    onDateSelect(date)
  }

  const handleConfirm = async () => {
    if (!wizardState.orderId || !wizardState.speakingDate || !wizardState.speakingTimeSlot) {
      return
    }

    try {
      const result = await bookSpeaking.mutateAsync({
        order_id: Number(wizardState.orderId),
        selected_date: wizardState.speakingDate,
        time_slot: wizardState.speakingTimeSlot,
        teacher_id: wizardState.speakingTeacherId ? Number(wizardState.speakingTeacherId) : undefined,
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
              selectedDate={wizardState.speakingDate}
              selectedSlot={wizardState.speakingTimeSlot}
              onDateSelect={handleDateSelect}
              onSlotSelect={handleSlotSelect}
              isLoadingDates={isLoadingDates}
              isLoadingSlots={isLoadingSlots}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review Selection */}
      {isStep2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Step 2: Review Your Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {wizardState.speakingDate && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Selected Date</p>
                  <p className="font-semibold">{formatDate(wizardState.speakingDate)}</p>
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
              <h4 className="font-semibold mb-2">Speaking Exam</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Duration: Approximately 15-20 minutes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Part 1: Introduction and Interview
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Part 2: Long Turn (Cue Card)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Part 3: Discussion
                </li>
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirm}
              disabled={bookSpeaking.isPending}
            >
              {bookSpeaking.isPending ? (
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
              Your Speaking exam has been booked successfully. You will receive a confirmation email shortly.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
