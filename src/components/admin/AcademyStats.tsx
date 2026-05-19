import type { AcademyStats } from '@/api/analytics'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, BookOpen, ShoppingCart, DollarSign, Clock } from 'lucide-react'

interface AcademyStatsCardProps {
  academy: AcademyStats
  loading?: boolean
  comparison?: {
    avgUsers: number
    avgExams: number
    avgRevenue: number
  }
}

export function AcademyStatsCard({ academy, loading = false, comparison }: AcademyStatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = [
    {
      label: 'Total Users',
      value: academy.total_users,
      subValue: `${academy.active_users} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      comparison: comparison?.avgUsers ? ((academy.total_users - comparison.avgUsers) / comparison.avgUsers) * 100 : undefined,
    },
    {
      label: 'Exams Taken',
      value: academy.total_exams,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      comparison: comparison?.avgExams ? ((academy.total_exams - comparison.avgExams) / comparison.avgExams) * 100 : undefined,
    },
    {
      label: 'Orders',
      value: academy.total_orders,
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      label: 'Revenue',
      value: `$${academy.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      comparison: comparison?.avgRevenue ? ((academy.total_revenue - comparison.avgRevenue) / comparison.avgRevenue) * 100 : undefined,
    },
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">{academy.academy_name}</h3>
            <p className="text-xs text-muted-foreground">{academy.academy_slug}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`rounded-full p-1.5 ${stat.bgColor}`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{stat.value}</span>
                  {stat.comparison !== undefined && (
                    <span className={`text-xs ${stat.comparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.comparison >= 0 ? '+' : ''}{stat.comparison.toFixed(1)}%
                    </span>
                  )}
                </div>
                {stat.subValue && (
                  <p className="text-xs text-muted-foreground">{stat.subValue}</p>
                )}
              </div>
            ))}
          </div>
          {academy.pending_gradings > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-950/30">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700 dark:text-orange-300">
                {academy.pending_gradings} pending gradings
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
