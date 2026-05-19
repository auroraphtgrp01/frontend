import { Link } from 'react-router-dom'
import {
  Building2,
  Users,
  TrendingUp,
  ArrowRight,
  ShoppingCart,
  ClipboardCheck,
  DollarSign,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/admin/StatsCard'
import { ActivityFeed } from '@/components/admin/ActivityFeed'
import { CrossAcademyTable } from '@/components/admin/CrossAcademyTable'
import { useAcademys } from '@/api/academys'
import { useGlobalUsers, useAcademyUsers } from '@/api/users'
import { usePlatformStats, useAcademyStats } from '@/api/analytics'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { isSuperAdmin } = useAuth()
  const platformView = isSuperAdmin()

  const { data: academys, isLoading: academysLoading } = useAcademys({
    enabled: platformView,
  })
  const { data: globalUsers } = useGlobalUsers(undefined, { enabled: platformView })
  const { data: academyUsers } = useAcademyUsers({ enabled: !platformView })
  const { data: stats, isLoading: statsLoading } = usePlatformStats({
    enabled: platformView,
  })
  const { data: academyStatsRows, isLoading: academyStatsLoading } = useAcademyStats(
    undefined,
    { enabled: !platformView },
  )

  const recentAcademys = academys?.slice(0, 5) || []

  const totalTenants = academys?.length || 0
  const activeTenants = academys?.filter((a) => a.is_active).length || 0
  const academyRow = academyStatsRows?.[0]
  const totalUsers = platformView
    ? globalUsers?.length || 0
    : academyRow?.total_users ?? academyUsers?.length ?? 0

  const statsLoadingState = platformView ? statsLoading : academyStatsLoading

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {platformView
              ? 'Overview of your academy platform'
              : 'Overview of your academy'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards — platform view omits order/grading ops KPIs */}
      <div
        className={
          platformView
            ? 'grid gap-4 md:grid-cols-2'
            : 'grid gap-4 md:grid-cols-2 lg:grid-cols-4'
        }
      >
        <StatsCard
          title={platformView ? 'Total Tenants' : 'Academy'}
          value={
            statsLoadingState
              ? 0
              : platformView
                ? stats?.total_academies || totalTenants
                : 1
          }
          change={platformView ? stats?.revenue_change : undefined}
          changeType={
            platformView && stats ? (stats.revenue_change >= 0 ? 'up' : 'down') : 'neutral'
          }
          icon={Building2}
          loading={statsLoadingState}
          subtitle={
            platformView
              ? `${activeTenants} active`
              : academyRow?.academy_name || 'Current tenant'
          }
        />
        <StatsCard
          title="Total Users"
          value={
            statsLoadingState
              ? 0
              : platformView
                ? stats?.total_users || totalUsers
                : totalUsers
          }
          icon={Users}
          loading={statsLoadingState}
          subtitle={platformView ? 'across all tenants' : 'in this academy'}
        />
        {!platformView && (
          <>
            <StatsCard
              title="Total Orders"
              value={
                statsLoadingState
                  ? 0
                  : academyRow?.total_orders ?? 0
              }
              icon={ShoppingCart}
              loading={statsLoadingState}
            />
            <StatsCard
              title="Pending Grading"
              value={
                statsLoadingState
                  ? 0
                  : academyRow?.pending_gradings ?? 0
              }
              icon={ClipboardCheck}
              loading={statsLoadingState}
            />
          </>
        )}
      </div>

      {/* Revenue and Exams Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {platformView ? 'Monthly Revenue' : 'Total Revenue'}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoadingState ? (
              <Skeleton className="h-8 w-24" />
            ) : platformView ? (
              <>
                <div className="text-2xl font-bold">
                  ${((stats?.monthly_revenue || 0) / 100).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.revenue_change !== undefined && (
                    <span
                      className={stats.revenue_change >= 0 ? 'text-green-600' : 'text-red-600'}
                    >
                      {stats.revenue_change >= 0 ? '+' : ''}
                      {stats.revenue_change}%{' '}
                    </span>
                  )}
                  vs last month
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${((academyRow?.total_revenue || 0) / 100).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time (this academy)</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {platformView ? 'Exams This Month' : 'Total Exams'}
              </CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoadingState ? (
              <Skeleton className="h-8 w-16" />
            ) : platformView ? (
              <>
                <div className="text-2xl font-bold">{stats?.exams_this_month || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.exams_change !== undefined && (
                    <span className={stats.exams_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {stats.exams_change >= 0 ? '+' : ''}
                      {stats.exams_change}%{' '}
                    </span>
                  )}
                  vs last month
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{academyRow?.total_exams ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">In this academy</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Tenants — platform system_admin only */}
        {platformView ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Tenants</CardTitle>
                <CardDescription>Latest added tenants</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/tenants">
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {academysLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : recentAcademys.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No tenants yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAcademys.map((academy) => (
                      <TableRow key={academy.id}>
                        <TableCell className="font-medium">{academy.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {academy.slug}
                        </TableCell>
                        <TableCell>
                          <Badge variant={academy.is_active ? 'success' : 'secondary'}>
                            {academy.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(academy.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Academy summary</CardTitle>
              <CardDescription>Stats for your current academy context</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use <strong>Analytics</strong> for detailed reports when available for your role.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {platformView && (
              <Button variant="outline" className="justify-start h-auto py-4" asChild>
                <Link to="/admin/tenants/new">
                  <Building2 className="mr-3 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Create Tenant</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Add a new academy tenant
                    </div>
                  </div>
                </Link>
              </Button>
            )}
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link to="/admin/users/new">
                <Users className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Create User</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Add a new user account
                  </div>
                </div>
              </Link>
            </Button>
            {!platformView && (
              <Button variant="outline" className="justify-start h-auto py-4" asChild>
                <Link to="/admin/grading">
                  <ClipboardCheck className="mr-3 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">View Grading Queue</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Review pending submissions
                    </div>
                  </div>
                </Link>
              </Button>
            )}
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link to="/admin/analytics">
                <BarChart3 className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">View Analytics</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Platform performance insights
                  </div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Academy Performance — platform system_admin only */}
      {platformView && <CrossAcademyTable compact />}

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  )
}
