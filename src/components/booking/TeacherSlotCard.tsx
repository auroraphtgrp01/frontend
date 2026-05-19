import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { SlotAvailability } from '@/types/booking'

interface TeacherSlotCardProps {
  slot: SlotAvailability
  isSelected?: boolean
  onSelect: (slot: SlotAvailability) => void
  className?: string
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function TeacherSlotCard({
  slot,
  isSelected = false,
  onSelect,
  className,
}: TeacherSlotCardProps) {
  const isUnavailable = !slot.available

  return (
    <div
      className={cn(
        'bg-card rounded-lg border p-4 transition-all',
        isUnavailable && 'opacity-60',
        isSelected && 'border-primary shadow-md bg-primary/5',
        !isUnavailable && !isSelected && 'hover:border-primary/50 hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Teacher Avatar */}
        <Avatar className="h-12 w-12 border">
          {slot.teacher_avatar ? (
            <AvatarImage src={slot.teacher_avatar} alt={slot.teacher_name} />
          ) : (
            <AvatarFallback className="bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          )}
        </Avatar>

        {/* Teacher Info & Slots */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-medium truncate">{slot.teacher_name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                </span>
                {isUnavailable && (
                  <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                )}
              </div>
            </div>

            <Button
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => onSelect(slot)}
              disabled={isUnavailable}
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          </div>

          {/* Capacity Indicator */}
          {slot.capacity_remaining !== undefined && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      slot.capacity_remaining > 5 && 'bg-green-500',
                      slot.capacity_remaining > 2 && slot.capacity_remaining <= 5 && 'bg-yellow-500',
                      slot.capacity_remaining <= 2 && 'bg-red-500'
                    )}
                    style={{
                      width: `${Math.min(100, (slot.capacity_remaining / 10) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {slot.capacity_remaining} spots left
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
