import { Link } from 'react-router-dom'
import { Clock, User, FileText, Mic, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { GradingQueueItem as GradingQueueItemType } from '@/types/exam'
import { formatDistanceToNow } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface GradingQueueItemProps {
  item: GradingQueueItemType
  loading?: boolean
  onClaim?: (id: string) => void
  selected?: boolean
  onSelect?: (id: string) => void
}

function getSkillIcon(skillType: string) {
  switch (skillType) {
    case 'writing':
      return FileText
    case 'speaking':
      return Mic
    default:
      return FileText
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">Pending</Badge>
    case 'in_review':
      return <Badge variant="secondary">In Review</Badge>
    case 'approved':
      return <Badge variant="success">Approved</Badge>
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function GradingQueueItem({ item, loading, onClaim, selected, onSelect }: GradingQueueItemProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const SkillIcon = getSkillIcon(item.skill_type)
  const isUrgent = item.priority && item.priority > 5
  const isAssigned = !!item.assigned_to

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-all cursor-pointer',
        selected && 'ring-2 ring-primary',
        isUrgent && 'border-orange-200 dark:border-orange-800'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Selection checkbox */}
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(item.id)}
              className="h-4 w-4 rounded border-gray-300"
            />
          )}

          {/* Student Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{item.student_name}</span>
              {isUrgent && (
                <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="truncate">{item.exam_title}</span>
              <span className="flex items-center gap-1">
                <SkillIcon className="h-3 w-3" />
                {item.skill_type.charAt(0).toUpperCase() + item.skill_type.slice(1)}
              </span>
            </div>
          </div>

          {/* Status & Time */}
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(item.status)}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(item.submitted_at))} ago
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {item.status === 'pending' && onClaim && !isAssigned && (
              <Button size="sm" variant="outline" onClick={() => onClaim(item.id)}>
                Claim
              </Button>
            )}
            <Button size="sm" asChild>
              <Link to={`/admin/grading/${item.id}`}>
                Start Grading
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Additional Info */}
        {item.assigned_to && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span>Assigned to {item.assigned_to}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
