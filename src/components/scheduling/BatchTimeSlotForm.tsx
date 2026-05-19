'use client'

import { useState, useMemo } from 'react'
import { Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TeacherSelect } from '@/components/appointment/TeacherSelect'
import type { CreateTimeSlotBatch } from '@/types/scheduling'

interface BatchTimeSlotFormProps {
  onSubmit: (slots: CreateTimeSlotBatch[]) => void
  isLoading?: boolean
}

const PERIODS = [
  { label: 'Morning (7:00 - 12:00)', value: 'morning', start: '07:00', end: '12:00' },
  { label: 'Afternoon (12:00 - 18:00)', value: 'afternoon', start: '12:00', end: '18:00' },
  { label: 'Evening (18:00 - 22:00)', value: 'evening', start: '18:00', end: '22:00' },
  { label: 'Custom', value: 'custom', start: '', end: '' },
]

const SLOT_DURATIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: '90 minutes', value: 90 },
]

const GAP_OPTIONS = [
  { label: 'No gap', value: 0 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
]

const generateTimeSlots = (
  startHour: number,
  endHour: number,
  duration: number,
  gap: number
): { start_time: string; end_time: string }[] => {
  const slots: { start_time: string; end_time: string }[] = []
  let currentHour = startHour
  let currentMinute = 0

  while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
    const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`

    let endMinute = currentMinute + duration
    let endHourAdjusted = currentHour
    if (endMinute >= 60) {
      endHourAdjusted += Math.floor(endMinute / 60)
      endMinute = endMinute % 60
    }

    const endTime = `${endHourAdjusted.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`

    if (endHourAdjusted > endHour || (endHourAdjusted === endHour && endMinute > 0)) {
      break
    }

    slots.push({ start_time: startTime, end_time: endTime })

    // Move to next slot
    currentMinute += duration + gap
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60)
      currentMinute = currentMinute % 60
    }
  }

  return slots
}

export const BatchTimeSlotForm = ({ onSubmit, isLoading }: BatchTimeSlotFormProps) => {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [period, setPeriod] = useState<string>('morning')
  const [customStart, setCustomStart] = useState<string>('09:00')
  const [customEnd, setCustomEnd] = useState<string>('17:00')
  const [duration, setDuration] = useState<number>(60)
  const [gap, setGap] = useState<number>(0)
  const [capacity, setCapacity] = useState<number>(10)
  const [teacherId, setTeacherId] = useState<string>('')

  const periodConfig = useMemo(() => {
    if (period === 'custom') {
      return { start: customStart, end: customEnd }
    }
    return PERIODS.find((p) => p.value === period) || PERIODS[0]
  }, [period, customStart, customEnd])

  const generatedSlots = useMemo(() => {
    if (!startDate || !endDate) return []

    const slots: CreateTimeSlotBatch[] = []
    const startHour = parseInt(periodConfig.start.split(':')[0], 10)
    const endHour = parseInt(periodConfig.end.split(':')[0], 10)

    const timeSlots = generateTimeSlots(startHour, endHour, duration, gap)

    // Generate for each date in range
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      timeSlots.forEach((slot) => {
        slots.push({
          date: dateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          capacity,
          teacher_id: teacherId || undefined,
        })
      })
    }

    return slots
  }, [startDate, endDate, periodConfig, duration, gap, capacity, teacherId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (generatedSlots.length === 0) return
    onSubmit(generatedSlots)
  }

  const handleClear = () => {
    setStartDate('')
    setEndDate('')
    setPeriod('morning')
    setDuration(60)
    setGap(0)
    setCapacity(10)
    setTeacherId('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]}
              className="pl-10"
              required
            />
          </div>
        </div>
      </div>

      {/* Time Period */}
      <div className="space-y-2">
        <Label htmlFor="period">Time Period</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Time Range */}
      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customStart">Start Time</Label>
            <Input
              type="time"
              id="customStart"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customEnd">End Time</Label>
            <Input
              type="time"
              id="customEnd"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              required
            />
          </div>
        </div>
      )}

      {/* Duration and Gap */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Slot Duration</Label>
          <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v, 10))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOT_DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value.toString()}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gap">Gap Between Slots</Label>
          <Select value={gap.toString()} onValueChange={(v) => setGap(parseInt(v, 10))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GAP_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value.toString()}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity per Slot</Label>
          <Input
            type="number"
            id="capacity"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
            min={1}
            max={100}
            required
          />
        </div>
      </div>

      {/* Teacher Assignment */}
      <div className="space-y-2">
        <Label>Assign Teacher (Optional)</Label>
        <TeacherSelect value={teacherId} onChange={setTeacherId} />
      </div>

      {/* Preview */}
      {generatedSlots.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Preview: {generatedSlots.length} slots will be created</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-gray-500"
              >
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {generatedSlots.slice(0, 20).map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm px-2 py-1 bg-gray-50 rounded"
                >
                  <span>{slot.date}</span>
                  <span className="font-mono">
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </span>
                  <span className="text-gray-500">Cap: {slot.capacity}</span>
                </div>
              ))}
              {generatedSlots.length > 20 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  ...and {generatedSlots.length - 20} more slots
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleClear}>
          Clear
        </Button>
        <Button type="submit" disabled={generatedSlots.length === 0 || isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          {isLoading ? 'Creating...' : `Create ${generatedSlots.length} Slots`}
        </Button>
      </div>
    </form>
  )
}
