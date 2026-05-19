import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTrialGradingQueue, useTrialQueueItem, useTrialPick, useTrialApprove, type TrialSkill } from '@/api/trialExam'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, RefreshCw, PenTool, Mic, BookOpen, Headphones, Filter, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

// ============================================================
// Helpers
// ============================================================

function SkillIcon({ skill }: { skill: string }) {
  switch (skill) {
    case 'reading': return <BookOpen className="h-4 w-4" />
    case 'listening': return <Headphones className="h-4 w-4" />
    case 'writing': return <PenTool className="h-4 w-4" />
    case 'speaking': return <Mic className="h-4 w-4" />
    default: return <BookOpen className="h-4 w-4" />
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending': return <Badge variant="outline">{status}</Badge>
    case 'in_review': return <Badge variant="secondary">{status.replace('_', ' ')}</Badge>
    case 'approved': return <Badge variant="default">{status}</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

// ============================================================
// Detail View: Grading Review
// ============================================================

function TrialGradingReview() {
  const { queueId } = useParams<{ queueId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: item, isLoading } = useTrialQueueItem(queueId ?? '')
  const pickMutation = useTrialPick()
  const approveMutation = useTrialApprove()

  const [bandScore, setBandScore] = useState(6.0)
  const [comments, setComments] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (!item) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Queue item not found.</AlertDescription>
      </Alert>
    )
  }

  const handleApprove = async () => {
    await approveMutation.mutateAsync({
      queueId: item.id,
      data: { band_score: bandScore, comments },
    })
    queryClient.invalidateQueries({ queryKey: ['trial-grading'] })
    navigate('/admin/grading/trial')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/grading/trial')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <SkillIcon skill={item.skill} />
          <h1 className="text-xl font-bold capitalize">{item.skill} Grading Review</h1>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Exam content */}
      {item.exam_content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {item.exam_content.title || 'Exam Prompt'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {item.exam_content.prompt || 'No prompt available.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student answer: Essay */}
      {item.skill === 'writing' && item.essay_text && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Essay</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="p-4 bg-gray-50 rounded-lg border font-serif text-sm whitespace-pre-wrap"
              style={{ fontFamily: "'Georgia', serif", lineHeight: 1.8 }}
            >
              {item.essay_text}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Word count: {item.essay_text.trim().split(/\s+/).filter(Boolean).length}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Student answer: Speaking (audio) */}
      {item.skill === 'speaking' && item.audio_key && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600">Audio file: {item.audio_key}</p>
              <p className="text-xs text-gray-400 mt-1">
                (Audio playback will be available when S3 is configured)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI grading info */}
      {item.session && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>Session ID: <code className="text-xs">{item.session_id}</code></p>
            <p>Started: {item.session.started_at ? new Date(item.session.started_at).toLocaleString() : 'N/A'}</p>
            <p>Submitted: {new Date(item.created_at).toLocaleString()}</p>
            {item.assigned_teacher_id && (
              <p>Assigned to: <code className="text-xs">{item.assigned_teacher_id}</code></p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grading form */}
      {item.status === 'in_review' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grade Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Band score selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Band Score (0.0 – 9.0)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={9}
                  step={0.5}
                  value={bandScore}
                  onChange={(e) => setBandScore(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-2xl font-bold w-16 text-center">{bandScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0.0</span>
                <span>4.5</span>
                <span>9.0</span>
              </div>
            </div>

            {/* Comments / feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teacher Comments & Feedback
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter detailed feedback for the student..."
                rows={6}
                className="resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/grading/trial')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="gap-2"
              >
                {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle className="h-4 w-4" />
                Approve & Publish Result
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {item.status === 'pending' && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              This item is pending. Pick it to start reviewing.
            </p>
            <Button
              onClick={async () => {
                await pickMutation.mutateAsync(item.id)
                queryClient.invalidateQueries({ queryKey: ['trial-grading'] })
              }}
              disabled={pickMutation.isPending}
            >
              {pickMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Pick for Review
            </Button>
          </CardContent>
        </Card>
      )}

      {item.status === 'approved' && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-700 font-medium">This submission has been approved.</p>
            <p className="text-sm text-gray-500 mt-1">
              Approved at: {item.approved_at ? new Date(item.approved_at).toLocaleString() : 'N/A'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// List View: Queue
// ============================================================

export default function TrialGradingQueuePage() {
  const { queueId } = useParams<{ queueId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [skillFilter, setSkillFilter] = useState<'all' | TrialSkill>('all')
  const pickMutation = useTrialPick()

  const { data: queueItems, isLoading, refetch } = useTrialGradingQueue({
    skill: skillFilter === 'all' ? undefined : skillFilter,
  })

  // If we have a queueId param, show the detail view
  if (queueId) {
    return <TrialGradingReview />
  }

  const pendingCount = queueItems?.filter((item) => item.status === 'pending').length ?? 0
  const inReviewCount = queueItems?.filter((item) => item.status === 'in_review').length ?? 0
  const approvedCount = queueItems?.filter((item) => item.status === 'approved').length ?? 0

  const handlePick = async (id: string) => {
    await pickMutation.mutateAsync(id)
    queryClient.invalidateQueries({ queryKey: ['trial-grading'] })
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trial Exam Grading Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review and grade Writing (AI-assisted) and Speaking trial exams.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{inReviewCount}</p>
          <p className="text-sm text-muted-foreground">In Review</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-sm text-muted-foreground">Approved Today</p>
        </div>
      </div>

      {/* Skill Filter */}
      <div className="flex items-center gap-4">
        <Tabs value={skillFilter} onValueChange={(v) => setSkillFilter(v as 'all' | TrialSkill)}>
          <TabsList>
            <TabsTrigger value="all">All Skills</TabsTrigger>
            <TabsTrigger value="writing">
              <PenTool className="mr-1 h-4 w-4" />Writing
            </TabsTrigger>
            <TabsTrigger value="speaking">
              <Mic className="mr-1 h-4 w-4" />Speaking
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Queue Table */}
      {queueItems && queueItems.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Skill</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Submitted At</th>
                <th className="px-4 py-3 text-left font-medium">Assigned To</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        <SkillIcon skill={item.skill} />
                      </span>
                      <span className="capitalize font-medium">{item.skill}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {item.assigned_teacher_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePick(item.id)}
                          disabled={pickMutation.isPending}
                        >
                          Pick
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => navigate(`/admin/grading/trial/${item.id}`)}
                      >
                        Review
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
          <Filter className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">No items in queue</p>
          <p className="text-sm text-muted-foreground">
            {skillFilter === 'all'
              ? 'There are no trial exams awaiting grading.'
              : `No ${skillFilter} submissions pending.`}
          </p>
        </div>
      )}
    </div>
  )
}
