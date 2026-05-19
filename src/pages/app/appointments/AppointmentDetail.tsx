'use client'

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  History,
  ChevronLeft,
  AlertCircle,
  PlayCircle,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RescheduleDialog } from '@/components/appointment/RescheduleDialog'
import { useAppointmentDetail, useCancelAppointment } from '@/api/appointments'
import { useStartAttempt } from '@/api/attempts'
import type { AppointmentDetail, SkillStatusInfo, AppointmentStatus } from '@/types/appointment'
import type { SkillStatus, SkillType } from '@/types/exam'
import { toast } from 'sonner'

const statusConfig: Record<string, { color: string; label: string }> = {
  awaiting_payment: { color: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Awaiting payment' },
  pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending' },
  booked: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Booked' },
  confirmed: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Confirmed' },
  reschedule_requested: { color: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Reschedule Requested' },
  in_progress: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'In Progress' },
  completed: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Cancelled' },
}

const examTypeLabels: Record<string, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  lrw: 'LRW',
  full_test: 'Full Test',
}

const skillInfo: Record<string, {
  label: string
  icon: typeof Headphones
  color: string
}> = {
  listening: { label: 'Listening', icon: Headphones, color: 'text-purple-600 bg-purple-50' },
  reading: { label: 'Reading', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
  writing: { label: 'Writing', icon: PenTool, color: 'text-orange-600 bg-orange-50' },
  speaking: { label: 'Speaking', icon: Mic, color: 'text-green-600 bg-green-50' },
}

const skillStatusConfig: Record<string, { color: string; label: string }> = {
  not_started: { color: 'bg-gray-100 text-gray-600 border-gray-300', label: 'Not Started' },
  in_progress: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'In Progress' },
  submitted: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Submitted' },
  scored: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Scored' },
  manual_scored: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Graded' },
  expired: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Expired' },
}

interface SkillCardState {
  skill: SkillType
  status: SkillStatus | 'not_started'
  skill_attempt_id?: string
  exam_uuid?: string
  started_at?: string
  expires_at?: string
  submitted_at?: string
  can_start: boolean
  can_view_result: boolean
}

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isStartingExam, setIsStartingExam] = useState(false)
  const [startingSkill, setStartingSkill] = useState<SkillType | null>(null)

  const { data: appointment, isLoading, error } = useAppointmentDetail(id!)
  const startAttempt = useStartAttempt()
  const cancelAppointment = useCancelAppointment()

  // Derive skill states from appointment.skills (enriched by backend)
  const skillStates = buildSkillStates(appointment?.exam_type, appointment?.skills)

  function buildSkillStates(
    examType?: string,
    skills?: SkillStatusInfo[]
  ): SkillCardState[] {
    if (examType === 'lrw') {
      const targetSkills: SkillType[] = ['listening', 'reading', 'writing']
      return targetSkills.map((skill) => {
        const serverSkill = skills?.find((s) => s.skill === skill)
        const status: SkillStatus | 'not_started' = (serverSkill?.status as SkillStatus | 'not_started') || 'not_started'
        const isUpcoming = appointment && !['completed', 'cancelled'].includes(appointment.status)
        return {
          skill,
          status,
          skill_attempt_id: serverSkill?.skill_attempt_id,
          exam_uuid: serverSkill?.exam_uuid,
          started_at: serverSkill?.started_at,
          submitted_at: serverSkill?.submitted_at,
          can_start: !!(isUpcoming && (status === 'not_started' || status === 'in_progress')),
          can_view_result: status === 'submitted' || status === 'scored' || status === 'manual_scored',
        } satisfies SkillCardState
      })
    }
    if (examType === 'speaking') {
      const serverSkill = skills?.find((s) => s.skill === 'speaking')
      const status: SkillStatus | 'not_started' = (serverSkill?.status as SkillStatus | 'not_started') || 'not_started'
      const isUpcoming = appointment && !['completed', 'cancelled'].includes(appointment.status)
      return [{
        skill: 'speaking',
        status,
        skill_attempt_id: serverSkill?.skill_attempt_id,
        exam_uuid: serverSkill?.exam_uuid,
        started_at: serverSkill?.started_at,
        submitted_at: serverSkill?.submitted_at,
        can_start: !!(isUpcoming && (status === 'not_started' || status === 'in_progress')),
        can_view_result: status === 'submitted' || status === 'scored' || status === 'manual_scored',
      } satisfies SkillCardState]
    }
    return []
  }

  // When an attempt starts, navigate to session page
  useEffect(() => {
    // No-op: navigation happens in handleStartSkill directly
  }, [])

  const handleStartSkill = async (skill: SkillType) => {
    if (!appointment?.id) {
      toast.error('No appointment found')
      return
    }
    setIsStartingExam(true)
    setStartingSkill(skill)
    try {
      const res = await startAttempt.mutateAsync({
        mode: 'full_test',
        skill,
        idempotency_key: `${appointment.id}-${skill}-${Date.now()}`,
        appointment_id: appointment.id,
      })
      const raw = res as { attempt_id?: string; skill_attempt_id?: string; skills?: { id?: string; skill?: string }[] }
      const attemptId = raw.attempt_id || ''
      const skillAttemptId = raw.skill_attempt_id || raw.skills?.[0]?.id || ''
      if (!attemptId) throw new Error('No attempt_id in response')
      navigate(`/app/exams/session/${attemptId}?skill_attempt_id=${skillAttemptId}`)
    } catch (err: unknown) {
      type ErrWithResponse = { response?: { data?: { error?: { message?: string } } } }
      const msg = ((err as ErrWithResponse)?.response?.data?.error?.message) || `Failed to start ${skill}`
      toast.error(msg)
      setIsStartingExam(false)
      setStartingSkill(null)
    }
  }

  const handleStartExam = async () => {
    if (appointment?.exam_type === 'lrw') {
      await handleStartSkill('listening')
    } else if (appointment?.exam_type === 'speaking') {
      await handleStartSkill('speaking')
    }
  }

  const handleViewResult = (_skill: SkillType) => {
    const attemptId = appointment?.skills?.[0]?.skill_attempt_id
    if (attemptId) {
      navigate(`/app/results/${attemptId}`)
    }
  }

  const handleCancel = async () => {
    if (!id) return
    try {
      await cancelAppointment.mutateAsync(id)
      setShowCancelDialog(false)
      navigate('/app/appointments')
    } catch {
      // Error handled by mutation
    }
  }

  const handleAddToCalendar = () => {
    if (!appointment) return
    const startDateTime = new Date(`${appointment.appointment_date}T${appointment.time_slot.split('-')[0]}`)
    const endDateTime = new Date(`${appointment.appointment_date}T${appointment.time_slot.split('-')[1]}`)
    const formatDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDateTime)}
DTEND:${formatDate(endDateTime)}
SUMMARY:IELTS ${examTypeLabels[appointment.exam_type]} Appointment
DESCRIPTION:Appointment with ${appointment.teacher_name || 'assigned teacher'}
LOCATION:${appointment.location || 'TBD'}
END:VEVENT
END:VCALENDAR`
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `appointment-${appointment.id}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const isUpcoming = appointment && !['completed', 'cancelled'].includes(appointment.status)
  const canReschedule = isUpcoming && appointment.reschedule_count < appointment.max_reschedules
  const canCancel = isUpcoming && appointment.status !== 'reschedule_requested'
  const isLrwAppointment = appointment?.exam_type === 'lrw'
  const isSpeakingAppointment = appointment?.exam_type === 'speaking'
  const showSkillCards = isLrwAppointment || isSpeakingAppointment

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Appointment not found</h2>
        <p className="text-gray-500 mt-2">The appointment you're looking for doesn't exist.</p>
        <Button variant="outline" onClick={() => navigate('/app/appointments')} className="mt-4">
          Back to Appointments
        </Button>
      </div>
    )
  }

  const apptStatus = statusConfig[appointment.status] || { color: 'bg-gray-100', label: appointment.status }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/appointments')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
            <Badge className={apptStatus.color}>{apptStatus.label}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">ID: {appointment.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Exam Type</p>
                  <p className="font-medium">{examTypeLabels[appointment.exam_type] || appointment.exam_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{appointment.time_slot}</p>
                </div>
              </div>
              {appointment.location && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{appointment.location}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skill Cards */}
          {showSkillCards && (
            <Card>
              <CardHeader>
                <CardTitle>Exam Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {skillStates.map((s) => {
                  const info = skillInfo[s.skill]
                  const SkillIcon = info.icon
                  const skillStatus = skillStatusConfig[s.status] || skillStatusConfig['not_started']
                  const isStarting = isStartingExam && startingSkill === s.skill
                  return (
                    <div
                      key={s.skill}
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${info.color}`}>
                        <SkillIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{info.label}</p>
                        <Badge className={`text-xs mt-1 border ${skillStatus.color}`}>
                          {skillStatus.label}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {s.can_view_result && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewResult(s.skill)}
                          >
                            View Result
                          </Button>
                        )}
                        {s.can_start && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleStartSkill(s.skill)}
                            disabled={isStartingExam}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            {isStarting ? 'Starting...' : 'Start'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Teacher Card */}
          {appointment.teacher_name && (
            <Card>
              <CardHeader>
                <CardTitle>Teacher</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{appointment.teacher_name}</p>
                    <p className="text-sm text-gray-500">Assigned Teacher</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {appointment.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{appointment.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Reschedule History */}
          {appointment.reschedule_history && appointment.reschedule_history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Reschedule History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointment.reschedule_history.map((h) => (
                    <div key={h.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">{formatDateTime(h.requested_at)}</span>
                        <Badge variant="outline" className="text-xs">{h.status}</Badge>
                      </div>
                      <p className="text-sm mt-1">{h.previous_date} {h.previous_time_slot}</p>
                      <p className="text-sm text-gray-400">↓</p>
                      <p className="text-sm">{h.new_date} {h.new_time_slot}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(['booked', 'confirmed', 'in_progress', 'completed'] as AppointmentStatus[]).map((s, index) => {
                  const isActive = ['booked', 'confirmed', 'in_progress', 'completed'].indexOf(appointment.status) >= index
                  const isCurrent = appointment.status === s
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-primary' : 'bg-gray-200'} ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`} />
                      <span className={`text-sm ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                        {statusConfig[s]?.label || s}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Reschedule Info */}
          {isUpcoming && (
            <Card>
              <CardHeader>
                <CardTitle>Reschedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  {appointment.max_reschedules - appointment.reschedule_count} of {appointment.max_reschedules} reschedules remaining
                </p>
                {canReschedule ? (
                  <p className="text-sm text-green-600">You can request a reschedule</p>
                ) : (
                  <p className="text-sm text-amber-600">No reschedules remaining</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* For non-skill-card appointments (fallback), show single Start Exam */}
              {!showSkillCards && appointment.order_id && ['confirmed', 'booked', 'in_progress'].includes(appointment.status) && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleStartExam}
                  disabled={isStartingExam}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {isStartingExam ? 'Starting...' : 'Start Exam'}
                </Button>
              )}
              {canReschedule && (
                <Button variant="outline" className="w-full" onClick={() => setShowRescheduleDialog(true)}>
                  Request Reschedule
                </Button>
              )}
              {canCancel && (
                <Button variant="outline" className="w-full text-red-600 hover:bg-red-50" onClick={() => setShowCancelDialog(true)}>
                  Cancel Appointment
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={handleAddToCalendar}>
                Add to Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        appointmentId={appointment.id}
      />

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelAppointment.isPending}>
              {cancelAppointment.isPending ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
