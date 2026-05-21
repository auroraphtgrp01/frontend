import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SlotAvailability, AvailableDate } from '@/types/booking'

interface DateSlotPickerProps {
  availableDates?: AvailableDate[]
  slots?: SlotAvailability[]
  selectedDate?: string
  selectedSlot?: string
  onDateSelect: (date: string) => void
  onSlotSelect: (slot: SlotAvailability) => void
  isLoadingDates?: boolean
  isLoadingSlots?: boolean
  className?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function DateSlotPicker({
  availableDates = [],
  slots = [],
  selectedDate,
  selectedSlot,
  onDateSelect,
  onSlotSelect,
  isLoadingDates = false,
  isLoadingSlots = false,
  className,
}: DateSlotPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const availableDatesMap = useMemo(() => {
    const map = new Map<string, AvailableDate>()
    availableDates.forEach((d) => map.set(d.date, d))
    return map
  }, [availableDates])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: (Date | null)[] = []

    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }, [currentMonth])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const hasSlots = (date: Date) => {
    const dateStr = formatDate(date)
    const info = availableDatesMap.get(dateStr)
    return info?.has_slots ?? false
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const goToPrevMonthWithSlots = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonthWithSlots = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className={cn('flex flex-col lg:flex-row gap-6', className)}>
      {/* Calendar */}
      <div className="flex-1">
        <div className="bg-card rounded-lg border p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {isLoadingDates ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-10" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} />
                }

                const dateStr = formatDate(date)
                const isSelected = dateStr === selectedDate
                const isDateWithSlots = hasSlots(date)
                const isDisabled = isPast(date)

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onDateSelect(dateStr)}
                    className={cn(
                      'relative h-10 w-full rounded-md text-sm font-medium transition-all',
                      isDisabled && 'opacity-40 cursor-not-allowed',
                      !isDisabled && 'hover:bg-accent',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                      isDateWithSlots && !isSelected && 'bg-primary/10 text-primary hover:bg-primary/20'
                    )}
                  >
                    {date.getDate()}
                    {isDateWithSlots && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Quick Navigation */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="ghost" size="sm" onClick={goToPrevMonthWithSlots}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextMonthWithSlots}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="flex-1">
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Available Slots
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground">
                — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </h3>

          {!selectedDate ? (
            <div className="text-center py-8 text-muted-foreground">
              Select a date to see available slots
            </div>
          ) : isLoadingSlots ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No slots available for this date</p>
              <p className="text-sm text-muted-foreground mt-1">Please select another date</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {slots.map((slot) => {
                const isSelected = slot.slot_id === selectedSlot
                const isUnavailable = !slot.available

                return (
                  <button
                    key={slot.slot_id}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => onSlotSelect(slot)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-all',
                      isUnavailable && 'opacity-50 cursor-not-allowed bg-muted',
                      !isUnavailable && isSelected && 'border-primary bg-primary/10',
                      !isUnavailable && !isSelected && 'hover:border-primary/50 hover:bg-accent'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                        </div>
                        {slot.capacity_remaining !== undefined && slot.capacity_remaining <= 3 && (
                          <Badge variant="warning" className="text-xs">
                            {slot.capacity_remaining} left
                          </Badge>
                        )}
                      </div>
                      {isSelected && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    {slot.teacher_name && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Teacher: {slot.teacher_name}
                      </div>
                    )}
                    {slot.blocked_reason && (
                      <div className="text-xs text-destructive mt-1">
                        Conflicts with your existing schedule.
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
