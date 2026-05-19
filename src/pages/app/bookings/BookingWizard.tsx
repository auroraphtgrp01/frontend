import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookingStepper } from '@/components/booking/BookingStepper'
import { BookingLRW } from './BookingLRW'
import { BookingSpeaking } from './BookingSpeaking'
import { BookingPackage } from './BookingPackage'
import { BookingConfirm } from './BookingConfirm'
import type { BookingMode, BookingWizardState, SlotAvailability, BookingResponse } from '@/types/booking'
import { BOOKING_STEPS } from '@/types/booking'

export default function BookingWizard() {
  const { mode = 'lrw' } = useParams<{ mode?: BookingMode }>()
  const navigate = useNavigate()
  const steps = BOOKING_STEPS[mode] || BOOKING_STEPS.lrw

  const [wizardState, setWizardState] = useState<BookingWizardState>({
    mode: mode || 'lrw',
    currentStep: 1,
  })

  const [bookingResult, setBookingResult] = useState<BookingResponse | null>(null)

  const canGoNext = (): boolean => {
    switch (mode) {
      case 'lrw':
        return !!wizardState.lrwDate && !!wizardState.lrwTimeSlot
      case 'speaking':
        return !!wizardState.speakingDate && !!wizardState.speakingTimeSlot
      case 'package':
        if (wizardState.currentStep === 1) {
          return !!wizardState.lrwDate && !!wizardState.lrwTimeSlot
        }
        if (wizardState.currentStep === 2) {
          return !!wizardState.speakingDate && !!wizardState.speakingTimeSlot
        }
        return false
      default:
        return false
    }
  }

  const handleDateSelect = (date: string) => {
    if (mode === 'lrw' || (mode === 'package' && wizardState.currentStep === 1)) {
      setWizardState((prev) => ({ ...prev, lrwDate: date, lrwTimeSlot: undefined }))
    } else if (mode === 'speaking' || (mode === 'package' && wizardState.currentStep === 2)) {
      setWizardState((prev) => ({ ...prev, speakingDate: date, speakingTimeSlot: undefined }))
    }
  }

  const handleSlotSelect = (slot: SlotAvailability) => {
    if (mode === 'lrw' || (mode === 'package' && wizardState.currentStep === 1)) {
      setWizardState((prev) => ({
        ...prev,
        lrwTimeSlot: slot.slot_id,
        lrwTeacherId: slot.teacher_id,
      }))
    } else if (mode === 'speaking' || (mode === 'package' && wizardState.currentStep === 2)) {
      setWizardState((prev) => ({
        ...prev,
        speakingTimeSlot: slot.slot_id,
        speakingTeacherId: slot.teacher_id,
      }))
    }
  }

  const handleNext = () => {
    if (wizardState.currentStep < steps.length) {
      setWizardState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }))
    }
  }

  const handleBack = () => {
    if (wizardState.currentStep > 1) {
      setWizardState((prev) => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }

  const handleStepClick = (step: number) => {
    if (step < wizardState.currentStep) {
      setWizardState((prev) => ({ ...prev, currentStep: step }))
    }
  }

  const handleBookingComplete = (result: BookingResponse) => {
    setBookingResult(result)
    setWizardState((prev) => ({ ...prev, bookingResult: result }))
  }

  const handleReset = () => {
    setWizardState({
      mode: mode || 'lrw',
      currentStep: 1,
    })
    setBookingResult(null)
  }

  const handleGoToAppointments = () => {
    navigate('/app/appointments')
  }

  const renderStepContent = () => {
    if (bookingResult) {
      return (
        <BookingConfirm
          result={bookingResult}
          onBookAnother={handleReset}
          onViewAppointments={handleGoToAppointments}
        />
      )
    }

    switch (mode) {
      case 'lrw':
        return (
          <BookingLRW
            wizardState={wizardState}
            onDateSelect={handleDateSelect}
            onSlotSelect={handleSlotSelect}
            onBookingComplete={handleBookingComplete}
          />
        )
      case 'speaking':
        return (
          <BookingSpeaking
            wizardState={wizardState}
            onDateSelect={handleDateSelect}
            onSlotSelect={handleSlotSelect}
            onBookingComplete={handleBookingComplete}
          />
        )
      case 'package':
        return (
          <BookingPackage
            wizardState={wizardState}
            onDateSelect={handleDateSelect}
            onSlotSelect={handleSlotSelect}
            onBookingComplete={handleBookingComplete}
          />
        )
      default:
        return null
    }
  }

  const getModeTitle = (): string => {
    switch (mode) {
      case 'lrw':
        return 'Book Listening/Reading/Writing Exam'
      case 'speaking':
        return 'Book Speaking Exam'
      case 'package':
        return 'Book Full Package (LRW + Speaking)'
      default:
        return 'Book Exam'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{getModeTitle()}</h1>
        <p className="text-muted-foreground">
          Select your preferred date, time slot, and teacher for your exam
        </p>
      </div>

      {/* Stepper - hide when showing confirmation */}
      {!bookingResult && (
        <Card>
          <CardContent className="pt-6">
            <BookingStepper
              steps={steps}
              currentStep={wizardState.currentStep}
              onStepClick={handleStepClick}
            />
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons - hide when showing confirmation */}
      {!bookingResult && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={wizardState.currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {wizardState.currentStep} of {steps.length}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canGoNext()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
