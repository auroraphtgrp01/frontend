'use client'

import { useMemo, useState } from 'react'
import { Calendar } from 'lucide-react'
import { OrderAppointmentGroup } from '@/components/appointment/OrderAppointmentGroup'
import { RescheduleDialog } from '@/components/appointment/RescheduleDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyAppointmentsByOrder } from '@/api/appointments'
import type { Appointment, ExamType, AppointmentStatus } from '@/types/appointment'
import type { OrderAppointmentGroup as OrderAppointmentGroupType } from '@/types/order'

function filterAppointments(
  appointments: Appointment[],
  filters: { status?: AppointmentStatus; exam_type?: ExamType },
): Appointment[] {
  return appointments.filter((appointment) => {
    if (filters.status && appointment.status !== filters.status) return false
    if (filters.exam_type && appointment.exam_type !== filters.exam_type) return false
    return true
  })
}

function filterGroups(
  groups: OrderAppointmentGroupType[],
  filters: { status?: AppointmentStatus; exam_type?: ExamType },
  mode: 'upcoming' | 'past',
): OrderAppointmentGroupType[] {
  const today = new Date().toISOString().split('T')[0]

  return groups
    .map((group) => ({
      ...group,
      appointments: filterAppointments(group.appointments, filters).filter((appointment) =>
        mode === 'upcoming'
          ? appointment.appointment_date >= today
          : appointment.appointment_date < today,
      ),
    }))
    .filter((group) => group.appointments.length > 0)
}

export default function MyAppointments() {
  const [filters, setFilters] = useState<{
    status?: AppointmentStatus
    exam_type?: ExamType
  }>({})
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null)

  const { data: groupedData, isLoading, error } = useMyAppointmentsByOrder({ limit: 100 })

  const upcomingGroups = useMemo(
    () => filterGroups(groupedData?.data ?? [], filters, 'upcoming'),
    [groupedData?.data, filters],
  )
  const pastGroups = useMemo(
    () => filterGroups(groupedData?.data ?? [], filters, 'past'),
    [groupedData?.data, filters],
  )

  const visibleGroups = showUpcoming ? upcomingGroups : pastGroups

  const examTypes: ExamType[] = ['listening', 'reading', 'writing', 'speaking', 'lrw', 'full_test']
  const statuses: AppointmentStatus[] = [
    'awaiting_payment',
    'pending',
    'booked',
    'confirmed',
    'reschedule_requested',
    'in_progress',
    'completed',
    'cancelled',
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lịch thi theo đơn</h1>
        <p className="text-gray-500 mt-1">
          Mỗi đơn hiển thị đủ các ca thi L-R-W và Speaking đã đăng ký.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="px-3 py-2 border rounded-md text-sm"
          value={filters.exam_type || ''}
          onChange={(e) =>
            setFilters((current) => ({
              ...current,
              exam_type: (e.target.value as ExamType) || undefined,
            }))
          }
        >
          <option value="">Tất cả kỹ năng</option>
          {examTypes.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 border rounded-md text-sm"
          value={filters.status || ''}
          onChange={(e) =>
            setFilters((current) => ({
              ...current,
              status: (e.target.value as AppointmentStatus) || undefined,
            }))
          }
        >
          <option value="">Tất cả trạng thái</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>

        {(filters.status || filters.exam_type) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Không tải được lịch thi theo đơn</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            Thử lại
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setShowUpcoming(true)}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                showUpcoming
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sắp tới ({upcomingGroups.length})
            </button>
            <button
              onClick={() => setShowUpcoming(false)}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                !showUpcoming
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Đã qua ({pastGroups.length})
            </button>
          </div>

          {visibleGroups.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                {showUpcoming ? 'Chưa có lịch thi sắp tới' : 'Chưa có lịch thi đã qua'}
              </h3>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleGroups.map((group) => (
                <OrderAppointmentGroup
                  key={group.order_id}
                  orderId={group.order_id}
                  orderStatus={group.order_status}
                  orderTotal={group.order_total}
                  orderCreatedAt={group.order_created_at}
                  appointments={group.appointments}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {rescheduleAppointmentId && (
        <RescheduleDialog
          open={!!rescheduleAppointmentId}
          onOpenChange={(open) => !open && setRescheduleAppointmentId(null)}
          appointmentId={rescheduleAppointmentId}
          onSuccess={() => setRescheduleAppointmentId(null)}
        />
      )}
    </div>
  )
}
