import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsCard } from '@/components/admin/StatsCard'
import { ChartCard } from '@/components/admin/ChartCard'
import { useRevenueStats } from '@/api/analytics'

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month')
  const { data: revenue, isLoading } = useRevenueStats(period)

  const totalRevenue = revenue?.total_revenue || 0
  const monthlyRevenue = revenue?.monthly_revenue || []
  const recentOrders = revenue?.recent_orders || []

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
            <h1 className="text-2xl font-bold tracking-tight">Revenue Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Track revenue across all academies
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
          title="Total Revenue"
          value={`$${(totalRevenue / 100).toLocaleString()}`}
          icon={DollarSign}
          loading={isLoading}
          subtitle="all time"
        />
        <StatsCard
          title="This Month"
          value={`$${monthlyRevenue.length > 0 ? (monthlyRevenue[monthlyRevenue.length - 1] / 100).toLocaleString() : '0'}`}
          icon={Calendar}
          loading={isLoading}
          change={8}
          changeType="up"
        />
        <StatsCard
          title="Orders"
          value={recentOrders.length}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatsCard
          title="Avg Order Value"
          value={`$${recentOrders.length > 0 ? ((recentOrders.reduce((sum, o) => sum + o.amount, 0) / recentOrders.length) / 100).toFixed(2) : '0.00'}`}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4">
          {/* Revenue by Academy */}
          {revenue?.revenue_by_academy && revenue.revenue_by_academy.length > 0 && (
            <ChartCard title="Revenue by Academy" loading={isLoading}>
              <div className="space-y-4">
                {revenue.revenue_by_academy.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-semibold">${item.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${revenue.revenue_by_academy.reduce((sum, i) => sum + i.revenue, 0) > 0
                            ? (item.revenue / revenue.revenue_by_academy.reduce((sum, i) => sum + i.revenue, 0)) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {/* Revenue by Product */}
          {revenue?.revenue_by_product && revenue.revenue_by_product.length > 0 && (
            <ChartCard title="Revenue by Product" loading={isLoading}>
              <div className="space-y-4">
                {revenue.revenue_by_product.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-semibold">${item.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${revenue.revenue_by_product.reduce((sum, i) => sum + i.revenue, 0) > 0
                            ? (item.revenue / revenue.revenue_by_product.reduce((sum, i) => sum + i.revenue, 0)) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found for this period
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{order.user_name}</p>
                    <p className="text-sm text-muted-foreground">{order.academy_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${order.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
