'use client'

import { useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRescheduleQuota, useRequestReschedule } from '@/api/appointments'
import { useTimeSlots } from '@/api/timeslots'
import { TeacherSelect } from './TeacherSelect'
import { toast } from 'sonner'

interface RescheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
  onSuccess?: () => void
}

export const RescheduleDialog = ({
  open,
  onOpenChange,
  appointmentId,
  onSuccess,
}: RescheduleDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const { data: quota, isLoading: isLoadingQuota } = useRescheduleQuota(appointmentId)
  const { data: availableSlots, isLoading: isLoadingSlots } = useTimeSlots(
    selectedDate ? { date: selectedDate } : undefined
  )
  const requestReschedule = useRequestReschedule()

  const hasQuota = quota && quota.remaining > 0

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select a new date and time slot')
      return
    }

    try {
      await requestReschedule.mutateAsync({
        appointmentId,
        data: {
          new_date: selectedDate,
          new_time_slot: selectedTimeSlot,
          reason: reason || undefined,
        },
      })
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch {
      // Error handled by mutation
    }
  }

  const resetForm = () => {
    setSelectedDate('')
    setSelectedTimeSlot('')
    setSelectedTeacher('')
    setReason('')
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Reschedule</DialogTitle>
          <DialogDescription>
            Request a new appointment date and time. Your request will be reviewed by an admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quota Check */}
          {isLoadingQuota ? (
            <div className="text-center py-4 text-gray-500">Checking your reschedule quota...</div>
          ) : !hasQuota ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-amber-800 font-medium">No reschedules remaining</p>
              <p className="text-amber-600 text-sm mt-1">
                You have used all {quota?.max_allowed || 0} allowed reschedules for this appointment.
              </p>
            </div>
          ) : (
            <>
              {/* Remaining Quota */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  You have <strong>{quota?.remaining}</strong> of {quota?.max_allowed} reschedules
                  remaining.
                </p>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="date">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  New Date
                </Label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedTimeSlot('')
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Time Slot Selection */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label>
                    <Clock className="inline h-4 w-4 mr-1" />
                    New Time Slot
                  </Label>
                  {isLoadingSlots ? (
                    <div className="text-center py-2 text-gray-500">Loading available slots...</div>
                  ) : availableSlots?.data && availableSlots.data.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.data.map((slot) => {
                        const slotValue =
                          slot.time_slot ||
                          (slot.start_time && slot.end_time
                            ? `${slot.start_time}-${slot.end_time}`
                            : '')
                        const isSelected = selectedTimeSlot === slotValue
                        const isUnavailable = (slot.available ?? 0) <= 0

                        return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slotValue)}
                          disabled={isUnavailable || !slotValue}
                          className={`p-2 text-sm rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : isUnavailable
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-primary'
                          }`}
                        >
                          {slot.time_slot || slot.start_time || '—'}
                          <span className="block text-xs opacity-70">
                            {slot.available ?? 0}/{slot.capacity ?? 0} available
                          </span>
                        </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-gray-500">
                      No slots available for this date
                    </div>
                  )}
                </div>
              )}

              {/* Teacher Selection (Optional) */}
              <div className="space-y-2">
                <Label>Preferred Teacher (Optional)</Label>
                <TeacherSelect
                  value={selectedTeacher}
                  onChange={setSelectedTeacher}
                />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for rescheduling..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {hasQuota && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedDate || !selectedTimeSlot || requestReschedule.isPending}
            >
              {requestReschedule.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
