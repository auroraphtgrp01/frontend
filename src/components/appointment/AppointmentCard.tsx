import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Appointment } from '@/types/appointment'

interface AppointmentCardProps {
  appointment: Appointment
  onReschedule?: (appointmentId: string) => void
}

const examTypeLabels: Record<string, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  lrw: 'LRW',
  full_test: 'Full Test',
}

const examTypeColors: Record<string, string> = {
  listening: 'bg-blue-100 text-blue-800',
  reading: 'bg-purple-100 text-purple-800',
  writing: 'bg-orange-100 text-orange-800',
  speaking: 'bg-green-100 text-green-800',
  lrw: 'bg-indigo-100 text-indigo-800',
  full_test: 'bg-gray-100 text-gray-800',
}

const statusColors: Record<string, string> = {
  awaiting_payment: 'bg-amber-100 text-amber-800 border-amber-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  booked: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-green-100 text-green-800 border-green-300',
  reschedule_requested: 'bg-amber-100 text-amber-800 border-amber-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-gray-100 text-gray-800 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

const statusLabels: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  pending: 'Pending',
  booked: 'Booked',
  confirmed: 'Confirmed',
  reschedule_requested: 'Reschedule Requested',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const AppointmentCard = ({ appointment, onReschedule }: AppointmentCardProps) => {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  const isUpcoming = !['completed', 'cancelled'].includes(appointment.status)
  const canReschedule =
    isUpcoming &&
    appointment.reschedule_count < appointment.max_reschedules &&
    appointment.status !== 'reschedule_requested'

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleViewDetail = () => {
    navigate(`/app/appointments/${appointment.id}`)
  }

  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation()
    onReschedule?.(appointment.id)
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isHovered ? 'shadow-lg border-primary/50' : 'shadow-sm'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleViewDetail}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Date and Time */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">{formatDate(appointment.appointment_date)}</span>
              <span className="text-gray-400">•</span>
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{appointment.time_slot}</span>
            </div>

            {/* Exam Type Badge */}
            <div className="flex items-center gap-2">
              <Badge className={examTypeColors[appointment.exam_type] || 'bg-gray-100 text-gray-800'}>
                {examTypeLabels[appointment.exam_type] || appointment.exam_type}
              </Badge>
              <Badge className={statusColors[appointment.status] || 'bg-gray-100 text-gray-800'}>
                {statusLabels[appointment.status] || appointment.status}
              </Badge>
            </div>

            {/* Teacher */}
            {appointment.teacher_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{appointment.teacher_name}</span>
              </div>
            )}

            {/* Location */}
            {appointment.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{appointment.location}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={handleViewDetail}>
              View Detail
            </Button>
            {canReschedule && (
              <Button variant="secondary" size="sm" onClick={handleReschedule}>
                Reschedule
              </Button>
            )}
          </div>
        </div>

        {/* Reschedule Info */}
        {isUpcoming && appointment.max_reschedules > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {appointment.max_reschedules - appointment.reschedule_count} of {appointment.max_reschedules}{' '}
              reschedules remaining
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
