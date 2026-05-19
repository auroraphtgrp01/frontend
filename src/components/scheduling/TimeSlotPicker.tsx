'use client'

import { Clock, Users, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTimeSlotRange, parseTimeSlotRange } from '@/lib/time-slot'
import type { TimeSlot } from '@/types/scheduling'

interface TimeSlotPickerProps {
  slots: TimeSlot[]
  selectedSlot?: string
  onSelect: (slot: TimeSlot) => void
  isLoading?: boolean
}

const groupSlotsByPeriod = (slots: TimeSlot[]) => {
  const groups: { morning: TimeSlot[]; afternoon: TimeSlot[]; evening: TimeSlot[] } = {
    morning: [],
    afternoon: [],
    evening: [],
  }

  slots.forEach((slot) => {
    const { start } = parseTimeSlotRange(slot.time_slot || `${slot.start_time || ''}-${slot.end_time || ''}`)
    const hour = parseInt(start.split(':')[0] || '0', 10)
    if (hour < 12) {
      groups.morning.push(slot)
    } else if (hour < 18) {
      groups.afternoon.push(slot)
    } else {
      groups.evening.push(slot)
    }
  })

  return groups
}

export const TimeSlotPicker = ({ slots, selectedSlot, onSelect, isLoading }: TimeSlotPickerProps) => {
  const groupedSlots = groupSlotsByPeriod(slots)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>No time slots available for this date.</p>
      </div>
    )
  }

  const renderSlotGroup = (title: string, periodSlots: TimeSlot[]) => {
    if (periodSlots.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <Badge variant="secondary" className="text-xs">
            {periodSlots.length} slots
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {periodSlots.map((slot) => {
            const isSelected = selectedSlot === slot.id
            const isUnavailable = (slot.available ?? 0) <= 0

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => !isUnavailable && onSelect(slot)}
                disabled={isUnavailable}
                className={`relative p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : isUnavailable
                    ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium text-sm">
                      {formatTimeSlotRange(slot.time_slot, slot.start_time, slot.end_time)}
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 opacity-70" />
                  <span className="text-xs opacity-70">
                    {slot.booked ?? 0}/{slot.capacity ?? 0}
                  </span>
                </div>
                {slot.teacher_name && (
                  <div className="mt-1 text-xs opacity-70 truncate">{slot.teacher_name}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {renderSlotGroup('Morning', groupedSlots.morning)}
      {renderSlotGroup('Afternoon', groupedSlots.afternoon)}
      {renderSlotGroup('Evening', groupedSlots.evening)}
    </div>
  )
}
