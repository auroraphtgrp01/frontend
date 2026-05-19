import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Video, MapPin, User } from 'lucide-react'

interface Appointment {
  id: string
  title: string
  date: string
  time: string
  type: 'online' | 'offline'
  teacher_name: string
  status: 'upcoming' | 'completed' | 'cancelled'
}

interface UpcomingAppointmentsProps {
  appointments: Appointment[]
  loading?: boolean
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const isToday = new Date(appointment.date).toDateString() === new Date().toDateString()
  const isTomorrow =
    new Date(appointment.date).toDateString() ===
    new Date(Date.now() + 86400000).toDateString()

  const dateLabel = isToday
    ? 'Today'
    : isTomorrow
    ? 'Tomorrow'
    : new Date(appointment.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
      <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-xs font-medium text-primary">{dateLabel}</span>
        <span className="text-lg font-bold text-primary">{appointment.time}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{appointment.title}</p>
          <Badge
            variant={appointment.type === 'online' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {appointment.type === 'online' ? (
              <Video className="h-3 w-3 mr-1" />
            ) : (
              <MapPin className="h-3 w-3 mr-1" />
            )}
            {appointment.type === 'online' ? 'Online' : 'In-Person'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {appointment.teacher_name}
          </span>
        </div>
      </div>
    </div>
  )
}

export function UpcomingAppointments({ appointments, loading = false }: UpcomingAppointmentsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-14 w-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!appointments?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">No upcoming appointments</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/app/appointments">Book Now</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Upcoming Appointments</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/appointments">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appointments.slice(0, 3).map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
