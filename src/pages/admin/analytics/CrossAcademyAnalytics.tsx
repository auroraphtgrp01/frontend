import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Users, BookOpen, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/admin/StatsCard'
import { CrossAcademyTable } from '@/components/admin/CrossAcademyTable'
import { useAcademyStats, usePlatformStats } from '@/api/analytics'
import { useAuth } from '@/contexts/AuthContext'

export default function CrossAcademyAnalyticsPage() {
  const { isSuperAdmin } = useAuth()
  const platform = isSuperAdmin()
  const { data: academies, isLoading } = useAcademyStats(undefined, { enabled: platform })
  const { data: stats } = usePlatformStats({ enabled: platform })

  const topAcademies = academies
    ? [...academies].sort((a, b) => b.total_users - a.total_users).slice(0, 5)
    : []

  const totalRevenue = academies?.reduce((sum, a) => sum + a.total_revenue, 0) || 0
  const totalExams = academies?.reduce((sum, a) => sum + a.total_exams, 0) || 0
  const totalUsers = academies?.reduce((sum, a) => sum + a.total_users, 0) || 0

  if (!platform) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cross-Academy Analytics</h1>
            <p className="text-sm text-muted-foreground">
              This view is only available to users with the system_admin role.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cross-Academy Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Compare performance across all academies
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Academies"
          value={stats?.total_academies || 0}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          loading={isLoading}
          change={8}
          changeType="up"
        />
        <StatsCard
          title="Total Exams"
          value={totalExams}
          icon={BookOpen}
          loading={isLoading}
          change={12}
          changeType="up"
        />
        <StatsCard
          title="Total Revenue"
          value={`$${(totalRevenue / 100).toLocaleString()}`}
          icon={DollarSign}
          loading={isLoading}
          change={15}
          changeType="up"
        />
      </div>

      {/* Top Academies */}
      <div className="grid gap-4 lg:grid-cols-3">
        {topAcademies.map((academy, index) => (
          <div key={academy.academy_id} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
                {index + 1}
              </span>
              <h3 className="font-semibold">{academy.academy_name}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Users</span>
                <span className="font-semibold">{academy.total_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Exams</span>
                <span className="font-semibold">{academy.total_exams}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="font-semibold">
                  ${academy.total_revenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cross Academy Table */}
      <CrossAcademyTable showExport enabled={platform} />

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">User Distribution</h3>
          <div className="space-y-4">
            {topAcademies.map((academy) => (
              <div key={academy.academy_id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{academy.academy_name}</span>
                  <span className="text-muted-foreground">
                    {academy.total_users} ({totalUsers > 0 ? ((academy.total_users / totalUsers) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${totalUsers > 0 ? (academy.total_users / totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Revenue Distribution</h3>
          <div className="space-y-4">
            {topAcademies
              .sort((a, b) => b.total_revenue - a.total_revenue)
              .map((academy) => (
                <div key={academy.academy_id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{academy.academy_name}</span>
                    <span className="text-muted-foreground">
                      ${academy.total_revenue.toLocaleString()} (
                      {totalRevenue > 0 ? ((academy.total_revenue / totalRevenue) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${totalRevenue > 0 ? (academy.total_revenue / totalRevenue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
