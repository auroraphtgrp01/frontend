export function parseTimeSlotRange(timeSlot?: string): { start: string; end: string } {
  const [rawStart = '', rawEnd = ''] = (timeSlot || '').split('-')
  const start = rawStart.trim()
  const end = (rawEnd || rawStart).trim()

  return { start, end }
}

export function formatClockTime(time?: string): string {
  if (!time) return '—'

  const [hours = '0', minutes = '00'] = time.split(':')
  const hour = parseInt(hours, 10)
  if (Number.isNaN(hour)) return time

  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes.padStart(2, '0')} ${ampm}`
}

export function formatTimeSlotRange(timeSlot?: string, startTime?: string, endTime?: string): string {
  if (timeSlot?.trim()) return timeSlot.trim()

  const { start, end } = parseTimeSlotRange(
    startTime && endTime ? `${startTime}-${endTime}` : startTime || endTime,
  )
  if (!start && !end) return '—'

  return `${formatClockTime(start)} - ${formatClockTime(end)}`
}
