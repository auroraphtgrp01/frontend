import { Check, Calendar, Clock, BookOpen, User, Download, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BookingResponse, BookingAppointment } from '@/types/booking'

interface BookingConfirmProps {
  result: BookingResponse
  onBookAnother?: () => void
  onViewAppointments?: () => void
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

function getAppointmentIcon(type: BookingAppointment['type']) {
  switch (type) {
    case 'lrw':
      return <BookOpen className="h-5 w-5" />
    case 'speaking':
      return <Calendar className="h-5 w-5" />
    default:
      return <Clock className="h-5 w-5" />
  }
}

function getAppointmentTitle(type: BookingAppointment['type']): string {
  switch (type) {
    case 'lrw':
      return 'Listening/Reading/Writing Exam'
    case 'speaking':
      return 'Speaking Exam'
    default:
      return 'Exam'
  }
}

function generateCalendarUrl(appointments: BookingAppointment[]): string {
  const events = appointments.map((apt) => {
    const date = new Date(apt.date)
    const startTime = apt.time_slot
    const [hours, minutes] = startTime.split(':')
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000) // Assume 2 hours default

    const formatICSDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    return `BEGIN:VEVENT
DTSTART:${formatICSDate(date)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${getAppointmentTitle(apt.type)}
DESCRIPTION:Booking ID: ${appointments[0]?.id || 'N/A'}
END:VEVENT`
  })

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IMTO//Exam Booking//EN
${events.join('\n')}
END:VCALENDAR`

  return 'data:text/calendar;charset=utf8,' + encodeURIComponent(icsContent)
}

export function BookingConfirm({
  result,
  onBookAnother,
  onViewAppointments,
}: BookingConfirmProps) {
  const handleDownloadCalendar = () => {
    const url = generateCalendarUrl(result.appointments)
    const link = document.createElement('a')
    link.href = url
    link.download = `booking-${result.booking_id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-green-800">Booking Confirmed!</CardTitle>
              <CardDescription className="text-green-700">
                Your exam has been successfully booked
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="success" className="text-sm">
              Booking ID: {result.booking_id}
            </Badge>
            <Badge variant={result.status === 'confirmed' ? 'success' : 'secondary'} className="text-sm">
              Status: {result.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Appointments</h3>
        {result.appointments.map((appointment, index) => (
          <Card key={appointment.id || index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getAppointmentIcon(appointment.type)}
                  {getAppointmentTitle(appointment.type)}
                </CardTitle>
                <Badge
                  variant={appointment.status === 'confirmed' ? 'success' : 'secondary'}
                >
                  {appointment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(appointment.date)}</p>
                </div>
              </div>

              {/* Time Slot */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Slot</p>
                  <p className="font-medium">{formatTime(appointment.time_slot)}</p>
                </div>
              </div>

              {/* Teacher */}
              {appointment.teacher_name && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Teacher</p>
                    <p className="font-medium">{appointment.teacher_name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadCalendar}
            >
              <Download className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>

            {onViewAppointments && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={onViewAppointments}
              >
                View My Appointments
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {onBookAnother && (
              <Button
                className="flex-1"
                onClick={onBookAnother}
              >
                Book Another Exam
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Please arrive at least 15 minutes before your scheduled time
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Bring a valid photo ID (passport or national ID)
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              A confirmation email has been sent to your registered email address
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              To cancel or reschedule, please contact us at least 24 hours in advance
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
