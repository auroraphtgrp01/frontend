import { useActivityLog, type ActivityItem } from '@/api/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  UserPlus,
  ShoppingCart,
  ClipboardCheck,
  Building2,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'

const activityIcons = {
  user_registered: UserPlus,
  order_created: ShoppingCart,
  exam_completed: ClipboardCheck,
  grading_submitted: GraduationCap,
  academy_created: Building2,
}

const activityColors = {
  user_registered: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  order_created: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  exam_completed: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  grading_submitted: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
  academy_created: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const Icon = activityIcons[item.type] || MoreHorizontal
  const colorClass = activityColors[item.type] || 'bg-gray-100 text-gray-600'

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`rounded-full p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm">{item.message}</p>
        <div className="flex items-center gap-2">
          {item.academy_name && (
            <Badge variant="secondary" className="text-xs">
              {item.academy_name}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at))} ago
          </span>
        </div>
      </div>
    </div>
  )
}

interface ActivityFeedProps {
  limit?: number
  showHeader?: boolean
  className?: string
}

export function ActivityFeed({ limit = 10, showHeader = true, className }: ActivityFeedProps) {
  const { data: activityLog, isLoading } = useActivityLog({ page_size: limit })

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
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

  if (!activityLog?.items?.length) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-center py-6 text-muted-foreground text-sm">
            No recent activity
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="divide-y">
          {activityLog.items.map((item) => (
            <ActivityItemCard key={item.id} item={item} />
          ))}
        </div>
        {activityLog.has_more && (
          <div className="pt-4 text-center">
            <button className="text-sm text-primary hover:underline">
              Load more activity
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
