import { Link } from 'react-router-dom'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge'
import {
  appointmentExamTypeLabel,
  appointmentStatusLabel,
} from '@/lib/appointment-mapping'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Appointment } from '@/types/appointment'
import type { OrderStatus } from '@/types/order'

interface OrderAppointmentGroupProps {
  orderId: string
  orderStatus?: OrderStatus
  orderTotal?: number
  orderCreatedAt?: string
  appointments: Appointment[]
}

export function OrderAppointmentGroup({
  orderId,
  orderStatus,
  orderTotal,
  orderCreatedAt,
  appointments,
}: OrderAppointmentGroupProps) {
  const orderLabel = orderId.slice(0, 8).toUpperCase()

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
              <Link to={`/app/orders/${orderId}`} className="hover:underline">
                Đơn #{orderLabel}
              </Link>
            </CardTitle>
            {orderCreatedAt && (
              <p className="text-sm text-muted-foreground">
                Tạo lúc {formatDate(orderCreatedAt, 'datetime')}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {orderStatus && <OrderStatusBadge status={orderStatus} size="sm" />}
            {orderTotal != null && (
              <Badge variant="outline">{formatCurrency(orderTotal)}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="rounded-md border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium">{appointmentExamTypeLabel(appointment.exam_type)}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(appointment.appointment_date, 'full')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {appointment.time_slot}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{appointmentStatusLabel(appointment.status)}</Badge>
              <Button size="sm" asChild>
                <Link to={`/app/appointments/${appointment.id}`}>
                  Chi tiết
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
