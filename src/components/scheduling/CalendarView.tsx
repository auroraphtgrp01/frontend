'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SchedulingDay } from '@/types/scheduling'

interface CalendarViewProps {
  days: SchedulingDay[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onDayClick: (date: string) => void
  selectedDate?: string
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type CalendarDay = { date: string; day: number; isCurrentMonth: boolean; schedulingDay?: SchedulingDay }

export const CalendarView = ({
  days,
  currentMonth,
  onMonthChange,
  onDayClick,
  selectedDate,
}: CalendarViewProps) => {
  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const today = new Date().toISOString().split('T')[0]

  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const result: CalendarDay[] = []

    // Previous month days
    const prevMonth = new Date(year, month, 0)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i
      const d = new Date(year, month - 1, day)
      result.push({
        date: d.toISOString().split('T')[0],
        day,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const dateStr = d.toISOString().split('T')[0]
      result.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        schedulingDay: dayMap.get(dateStr),
      })
    }

    // Next month days to fill grid
    const remainingDays = 42 - result.length
    for (let day = 1; day <= remainingDays; day++) {
      const d = new Date(year, month + 1, day)
      result.push({
        date: d.toISOString().split('T')[0],
        day,
        isCurrentMonth: false,
      })
    }

    return result
  }, [currentMonth, dayMap])

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + direction)
    onMonthChange(newDate)
  }

  const goToToday = () => {
    onMonthChange(new Date())
  }

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const getDayStatus = (cd: CalendarDay) => {
    if (!cd.schedulingDay) return 'empty'
    if (!cd.schedulingDay.is_active) return 'inactive'
    const slotCount = cd.schedulingDay.slots?.length || 0
    if (slotCount === 0) return 'no-slots'
    return 'has-slots'
  }

  const getDayColor = (status: string, isPast: boolean) => {
    if (isPast) return 'bg-gray-100 text-gray-400 cursor-not-allowed'
    switch (status) {
      case 'has-slots':
        return 'bg-green-100 hover:bg-green-200 text-green-800 cursor-pointer'
      case 'no-slots':
        return 'bg-gray-50 hover:bg-gray-100 text-gray-600 cursor-pointer'
      case 'inactive':
        return 'bg-red-50 text-red-300 cursor-not-allowed'
      default:
        return 'hover:bg-gray-100 text-gray-700 cursor-pointer'
    }
  }

  const getSlotIndicator = (cd: CalendarDay) => {
    if (!cd.schedulingDay?.slots) return null
    const totalSlots = cd.schedulingDay.slots.length
    const availableSlots = cd.schedulingDay.slots.filter((s) => (s.available ?? 0) > 0).length
    return { total: totalSlots, available: availableSlots }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">{monthYear}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((cd) => {
          const isPast = cd.date < today
          const isToday = cd.date === today
          const isSelected = cd.date === selectedDate
          const status = getDayStatus(cd)
          const indicator = getSlotIndicator(cd)

          return (
            <button
              key={cd.date}
              type="button"
              onClick={() => !isPast && onDayClick(cd.date)}
              disabled={isPast || status === 'inactive'}
              className={`
                relative min-h-[80px] p-2 border-b border-r text-left transition-colors
                ${cd.isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'}
                ${isToday ? 'ring-2 ring-inset ring-primary' : ''}
                ${isSelected ? 'bg-primary/10' : ''}
                ${getDayColor(status, isPast)}
              `}
            >
              <span
                className={`text-sm font-medium ${
                  cd.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {cd.day}
              </span>

              {/* Slot Indicator */}
              {indicator && (
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      indicator.available > 0 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {indicator.available}/{indicator.total} available
                  </Badge>
                </div>
              )}

              {/* Status Indicator for empty/inactive days */}
              {status === 'empty' && cd.isCurrentMonth && !isPast && (
                <div className="mt-1 text-xs text-gray-400">No slots</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200" />
          <span>Has available slots</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-200" />
          <span>No slots</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-100" />
          <span>Past/Disabled</span>
        </div>
      </div>
    </div>
  )
}
