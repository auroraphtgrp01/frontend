import { useEffect, useState } from 'react'
import { Check, Loader2, Calendar, Clock, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateSlotPicker } from '@/components/booking/DateSlotPicker'
import { useSlotAvailability, useAvailableDates } from '@/api/exambooking'
import { useBookPackage } from '@/api/exambooking'
import type { BookingWizardState, SlotAvailability, BookingResponse } from '@/types/booking'

interface BookingPackageProps {
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

export function BookingPackage({
  wizardState,
  onDateSelect,
  onSlotSelect,
  onBookingComplete,
}: BookingPackageProps) {
  const [lrwSlot, setLrwSlot] = useState<SlotAvailability | null>(null)
  const [speakingSlot, setSpeakingSlot] = useState<SlotAvailability | null>(null)

  // Fetch available dates for LRW and Speaking
  const { data: lrwDates = [], isLoading: isLoadingLrwDates } = useAvailableDates('lrw')
  const { data: speakingDates = [], isLoading: isLoadingSpeakingDates } = useAvailableDates('speaking')

  // Fetch LRW slots
  const lrwSlotParams = wizardState.lrwDate
    ? { date: wizardState.lrwDate, type: 'lrw' as const }
    : null
  const { data: lrwSlotData, isLoading: isLoadingLrwSlots } = useSlotAvailability(lrwSlotParams)

  // Fetch Speaking slots
  const speakingSlotParams = wizardState.speakingDate
    ? { date: wizardState.speakingDate, type: 'speaking' as const }
    : null
  const { data: speakingSlotData, isLoading: isLoadingSpeakingSlots } = useSlotAvailability(speakingSlotParams)

  const bookPackage = useBookPackage()

  // Update LRW slot when wizardState changes
  useEffect(() => {
    if (wizardState.lrwTimeSlot && lrwSlotData?.slots) {
      const slot = lrwSlotData.slots.find((s) => s.slot_id === wizardState.lrwTimeSlot)
      if (slot) {
        setLrwSlot(slot)
      }
    } else {
      setLrwSlot(null)
    }
  }, [wizardState.lrwTimeSlot, lrwSlotData])

  // Update Speaking slot when wizardState changes
  useEffect(() => {
    if (wizardState.speakingTimeSlot && speakingSlotData?.slots) {
      const slot = speakingSlotData.slots.find((s) => s.slot_id === wizardState.speakingTimeSlot)
      if (slot) {
        setSpeakingSlot(slot)
      }
    } else {
      setSpeakingSlot(null)
    }
  }, [wizardState.speakingTimeSlot, speakingSlotData])

  const handleLrwSlotSelect = (slot: SlotAvailability) => {
    setLrwSlot(slot)
    onSlotSelect(slot)
  }

  const handleSpeakingSlotSelect = (slot: SlotAvailability) => {
    setSpeakingSlot(slot)
    onSlotSelect(slot)
  }

  const handleLrwDateSelect = (date: string) => {
    setLrwSlot(null)
    onDateSelect(date)
  }

  const handleSpeakingDateSelect = (date: string) => {
    setSpeakingSlot(null)
    onDateSelect(date)
  }

  const handleConfirm = async () => {
    if (
      !wizardState.orderId ||
      !wizardState.lrwDate ||
      !wizardState.lrwTimeSlot ||
      !wizardState.speakingDate ||
      !wizardState.speakingTimeSlot
    ) {
      return
    }

    try {
      const result = await bookPackage.mutateAsync({
        order_id: Number(wizardState.orderId),
        lrw_date: wizardState.lrwDate,
        lrw_time_slot: wizardState.lrwTimeSlot,
        speaking_date: wizardState.speakingDate,
        speaking_time_slot: wizardState.speakingTimeSlot,
        teacher_id: wizardState.lrwTeacherId
          ? Number(wizardState.lrwTeacherId)
          : wizardState.speakingTeacherId
            ? Number(wizardState.speakingTeacherId)
            : undefined,
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
      {/* Step 1: Select LRW Date & Slot */}
      {isStep1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Step 1: Select LRW Exam Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DateSlotPicker
              availableDates={lrwDates}
              slots={lrwSlotData?.slots || []}
              selectedDate={wizardState.lrwDate}
              selectedSlot={wizardState.lrwTimeSlot}
              onDateSelect={handleLrwDateSelect}
              onSlotSelect={handleLrwSlotSelect}
              isLoadingDates={isLoadingLrwDates}
              isLoadingSlots={isLoadingLrwSlots}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Speaking Date & Slot */}
      {isStep2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Step 2: Select Speaking Exam Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DateSlotPicker
              availableDates={speakingDates}
              slots={speakingSlotData?.slots || []}
              selectedDate={wizardState.speakingDate}
              selectedSlot={wizardState.speakingTimeSlot}
              onDateSelect={handleSpeakingDateSelect}
              onSlotSelect={handleSpeakingSlotSelect}
              isLoadingDates={isLoadingSpeakingDates}
              isLoadingSlots={isLoadingSpeakingSlots}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Confirm */}
      {isStep3 && (
        <div className="space-y-6">
          {/* LRW Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                LRW Exam Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {wizardState.lrwDate && (
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{formatDate(wizardState.lrwDate)}</p>
                  </div>
                </div>
              )}
              {lrwSlot && (
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Clock className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Slot</p>
                    <p className="font-semibold">
                      {formatTime(lrwSlot.start_time)} — {formatTime(lrwSlot.end_time)}
                    </p>
                    {lrwSlot.teacher_name && (
                      <p className="text-sm text-muted-foreground">Teacher: {lrwSlot.teacher_name}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Speaking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Speaking Exam Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {wizardState.speakingDate && (
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{formatDate(wizardState.speakingDate)}</p>
                  </div>
                </div>
              )}
              {speakingSlot && (
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Clock className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Slot</p>
                    <p className="font-semibold">
                      {formatTime(speakingSlot.start_time)} — {formatTime(speakingSlot.end_time)}
                    </p>
                    {speakingSlot.teacher_name && (
                      <p className="text-sm text-muted-foreground">Teacher: {speakingSlot.teacher_name}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Package Info */}
          <Card>
            <CardHeader>
              <CardTitle>Full Package Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2">IELTS Full Package (LRW + Speaking)</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Listening/Reading/Writing: Approximately 2.5 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Speaking: Approximately 15-20 minutes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Complete IELTS test experience
                  </li>
                </ul>
              </div>

              {wizardState.lrwDate && wizardState.speakingDate && (
                <div className="text-sm text-muted-foreground">
                  {wizardState.lrwDate === wizardState.speakingDate ? (
                    <p>Both exams are scheduled for the same day.</p>
                  ) : (
                    <p>Your LRW and Speaking exams are on different days.</p>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleConfirm}
                disabled={bookPackage.isPending}
              >
                {bookPackage.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking Package...
                  </>
                ) : (
                  <>
                    Confirm Package Booking
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
