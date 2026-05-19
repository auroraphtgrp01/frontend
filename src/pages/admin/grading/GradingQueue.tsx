import { useState } from 'react'
import { ClipboardCheck, Clock, CheckCircle, RefreshCw, Filter, CheckSquare, Square } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GradingQueueItem } from '@/components/grading/GradingQueueItem'
import { useGradingQueue } from '@/api/grading'
import type { SkillType } from '@/types/exam'
import { useQueryClient } from '@tanstack/react-query'

export default function GradingQueuePage() {
  const queryClient = useQueryClient()
  const [skillFilter, setSkillFilter] = useState<'all' | SkillType>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: queueItems, isLoading, refetch } = useGradingQueue({
    skill_type: skillFilter === 'all' ? undefined : skillFilter,
  })

  const pendingCount = queueItems?.filter((item) => item.status === 'pending').length || 0
  const inReviewCount = queueItems?.filter((item) => item.status === 'in_review').length || 0
  const completedTodayCount = queueItems?.filter((item) => item.status === 'approved').length || 0

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['grading-queue'] })
    refetch()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === (queueItems?.length || 0)) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(queueItems?.map((item) => item.id) || []))
    }
  }

  const handleClaim = async (id: string) => {
    console.log('Claiming item:', id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grading Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review and grade student submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                <ClipboardCheck className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inReviewCount}</p>
                <p className="text-sm text-muted-foreground">In Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTodayCount}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filter Submissions</CardTitle>
            {selectedIds.size > 0 && (
              <Button size="sm" variant="outline">
                Batch Approve ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Skill Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Skill:</span>
              <Tabs value={skillFilter} onValueChange={(v) => setSkillFilter(v as typeof skillFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="writing">Writing</TabsTrigger>
                  <TabsTrigger value="speaking">Speaking</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Select All */}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === (queueItems?.length || 0) ? (
                  <CheckSquare className="h-4 w-4 mr-2" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                Select All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !queueItems || queueItems.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No submissions pending review</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  All submissions have been graded. Check back later.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          queueItems.map((item) => (
            <GradingQueueItem
              key={item.id}
              item={item}
              onClaim={handleClaim}
              selected={selectedIds.has(item.id)}
              onSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-xs text-muted-foreground">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  )
}
