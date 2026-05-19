import { cn } from '@/lib/utils'
import { formatOrderStatus } from '@/lib/formatters'
import type { OrderStatus } from '@/types/order'

interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
  animate?: boolean
}

const STATUS_STYLES: Record<OrderStatus, { variant: string; icon: string; pulse?: boolean }> = {
  pending: {
    variant: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '⏳',
  },
  paid: {
    variant: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '✓',
  },
  processing: {
    variant: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: '⚙',
    pulse: true,
  },
  completed: {
    variant: 'bg-green-100 text-green-800 border-green-300',
    icon: '✓',
  },
  failed: {
    variant: 'bg-red-100 text-red-800 border-red-300',
    icon: '✕',
  },
  refunded: {
    variant: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '↩',
  },
  cancelled: {
    variant: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: '⊘',
  },
  error: {
    variant: 'bg-red-100 text-red-900 border-red-300',
    icon: '⚠',
  },
}

const SIZE_STYLES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function OrderStatusBadge({
  status,
  size = 'md',
  showIcon = false,
  className,
  animate = false,
}: OrderStatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  const label = formatOrderStatus(status)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        style.variant,
        SIZE_STYLES[size],
        animate && style.pulse && 'animate-pulse',
        className
      )}
    >
      {showIcon && <span>{style.icon}</span>}
      {label}
    </span>
  )
}

interface OrderStatusDotProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const DOT_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500',
  paid: 'bg-blue-500',
  processing: 'bg-purple-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  refunded: 'bg-gray-500',
  cancelled: 'bg-gray-400',
  error: 'bg-red-600',
}

const DOT_SIZES = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

export function OrderStatusDot({
  status,
  size = 'md',
  showLabel = false,
  className,
}: OrderStatusDotProps) {
  const dotColor = DOT_STYLES[status] || DOT_STYLES.pending
  const label = formatOrderStatus(status)

  if (!showLabel) {
    return (
      <span
        className={cn(
          'inline-block rounded-full',
          dotColor,
          DOT_SIZES[size],
          className
        )}
      />
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('rounded-full', dotColor, DOT_SIZES[size])} />
      <span className="text-sm font-medium">{label}</span>
    </span>
  )
}

interface OrderStatusTimelineProps {
  status: OrderStatus
  className?: string
}

const STATUS_ORDER: OrderStatus[] = ['pending', 'paid', 'processing', 'completed']
const FAILED_STATUSES: OrderStatus[] = ['failed', 'refunded', 'cancelled', 'error']

export function OrderStatusTimeline({ status, className }: OrderStatusTimelineProps) {
  const isFailed = FAILED_STATUSES.includes(status)
  const currentIndex = STATUS_ORDER.indexOf(status)

  if (isFailed) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
            ✕
          </span>
          <span className="font-medium text-red-600">{formatOrderStatus(status)}</span>
        </div>
        <p className="text-xs text-muted-foreground pl-8">
          Order was {status}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {STATUS_ORDER.map((step, index) => {
        const isComplete = currentIndex >= index
        const isCurrent = currentIndex === index
        const isPending = currentIndex < index

        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                isComplete && 'bg-green-500 text-white',
                isPending && 'bg-gray-200 text-gray-500',
              )}
            >
              {isComplete ? '✓' : index + 1}
            </div>
            <span
              className={cn(
                'text-sm',
                isCurrent && 'font-medium',
                isPending && 'text-muted-foreground',
              )}
            >
              {formatOrderStatus(step)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default OrderStatusBadge
