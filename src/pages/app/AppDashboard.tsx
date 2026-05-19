import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { BookOpen, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/admin/StatsCard'
import { QuickActions } from '@/components/app/QuickActions'
import { ExamHistoryCard } from '@/components/app/ExamHistoryCard'
import { UpcomingAppointments } from '@/components/app/UpcomingAppointments'
import { useAuth } from '@/contexts/AuthContext'
import { useMyAppointments } from '@/api/appointments'
import { isUpcomingAppointmentStatus } from '@/lib/appointment-mapping'
import type { Appointment as UserAppointment } from '@/types/appointment'
import type { ExamResult } from '@/types/exam'

interface Appointment {
  id: string
  title: string
  date: string
  time: string
  type: 'online' | 'offline'
  teacher_name: string
  status: 'upcoming' | 'completed' | 'cancelled'
}

const EMPTY_RESULTS: ExamResult[] = []

function mapDashboardAppointments(appointments: UserAppointment[]): Appointment[] {
  return appointments
    .filter((appointment) => isUpcomingAppointmentStatus(appointment.status))
    .map((appointment) => ({
      id: appointment.id,
      title: `${appointment.exam_type.toUpperCase()} session`,
      date: appointment.appointment_date,
      time: appointment.time_slot,
      type: 'offline' as const,
      teacher_name: appointment.teacher_name ?? '—',
      status: 'upcoming' as const,
    }))
}

export default function AppDashboardPage() {
  const { user } = useAuth()
  const resultsData = useMemo(
    () => ({ data: EMPTY_RESULTS, total: 0 }),
    [],
  )
  const resultsLoading = false

  const { data: appointmentsData, isLoading: appointmentsLoading } = useMyAppointments({
    limit: 50,
  })

  const dashboardAppointments = useMemo(
    () => mapDashboardAppointments(appointmentsData?.data ?? []),
    [appointmentsData?.data],
  )

  const statsData = useMemo(() => {
    const rows = resultsData?.data ?? []
    const withBand = rows.filter((r) => r.overall_band > 0)
    const average_band =
      withBand.length > 0
        ? withBand.reduce((s, r) => s + r.overall_band, 0) / withBand.length
        : null
    return {
      total_exams: rows.length,
      average_band,
    }
  }, [resultsData])

  const statsLoading = resultsLoading

  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your IELTS preparation
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/app/appointments">
            <Calendar className="h-4 w-4" />
            My Scheduled Exams
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Exams"
          value={statsLoading ? 0 : statsData.total_exams}
          icon={BookOpen}
          loading={statsLoading}
          subtitle="completed"
        />
        <StatsCard
          title="Upcoming"
          value={appointmentsLoading ? 0 : dashboardAppointments.length}
          icon={Calendar}
          loading={appointmentsLoading}
          subtitle="appointments"
        />
        <StatsCard
          title="Average Band"
          value={
            statsLoading
              ? '-'
              : statsData.average_band != null
                ? statsData.average_band.toFixed(1)
                : '-'
          }
          icon={TrendingUp}
          loading={statsLoading}
        />
        <StatsCard
          title="Results"
          value={resultsLoading ? 0 : resultsData?.data?.length || 0}
          icon={BookOpen}
          loading={resultsLoading}
          subtitle="available"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <QuickActions />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Exam Results */}
        <ExamHistoryCard
          results={resultsData?.data || []}
          loading={resultsLoading}
        />

        {/* Upcoming Appointments */}
        <UpcomingAppointments
          appointments={dashboardAppointments}
          loading={appointmentsLoading}
        />
      </div>

      {/* Performance Summary — only when real band scores exist (history list does not include bands). */}
      {resultsData?.data?.some((r) => r.overall_band > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Your Performance</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/results">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              {['Listening', 'Reading', 'Writing', 'Speaking', 'Overall'].map((skill, i) => {
                const bands = [
                  resultsData.data[0]?.listening_band,
                  resultsData.data[0]?.reading_band,
                  resultsData.data[0]?.writing_band,
                  resultsData.data[0]?.speaking_band,
                  resultsData.data[0]?.overall_band,
                ]
                const band = bands[i]
                const getBandColor = (b: number) => {
                  if (b >= 7.5) return 'text-green-600 dark:text-green-400'
                  if (b >= 6.5) return 'text-emerald-600 dark:text-emerald-400'
                  if (b >= 5.5) return 'text-yellow-600 dark:text-yellow-400'
                  return 'text-red-600 dark:text-red-400'
                }
                return (
                  <div key={skill} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{skill}</p>
                    <p className={`text-2xl font-bold ${getBandColor(band || 0)}`}>
                      {band?.toFixed(1) || '-'}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Attempts</span>
                <span className="font-medium">{resultsData.data.length} exams</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
