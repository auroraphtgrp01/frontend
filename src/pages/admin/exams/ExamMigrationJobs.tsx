import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useExamMigrationJobs,
  useExamMigrationJobDetail,
  useExamMigrationJobResults,
} from '@/api/exams'
import { formatDate } from '@/lib/utils'

function JobStatusBadge({ status }: { status: string }) {
  if (status === 'success') return <Badge className="bg-green-600">{status}</Badge>
  if (status === 'failed') return <Badge variant="destructive">{status}</Badge>
  if (status === 'running') return <Badge>{status}</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function ExamMigrationJobsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const jobs = useExamMigrationJobs()
  const detail = useExamMigrationJobDetail(jobId, { enabled: !!jobId })
  const results = useExamMigrationJobResults(jobId, { enabled: !!jobId })

  const selected = detail.data?.job
  const resultsData = results.data?.results
  const mutationData = results.data?.mutation

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam migration jobs</h1>
          <p className="text-sm text-muted-foreground">
            Follow admin migration jobs from <code className="text-xs">/api/v1/admin/exam-migrations/jobs</code>.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => jobs.refetch()} disabled={jobs.isFetching}>
          {jobs.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Jobs</CardTitle>
          <CardDescription>
            Auto-refresh every 15s. Click a job to open detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : jobs.isError ? (
            <p className="text-sm text-red-600">Failed to load migration jobs.</p>
          ) : !jobs.data?.length ? (
            <p className="text-sm text-muted-foreground">No migration job found.</p>
          ) : (
            <div className="space-y-2">
              {jobs.data.map((job) => (
                <Link
                  key={job.job_id}
                  to={`/admin/exam-migrations/${job.job_id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/30"
                >
                  <div>
                    <p className="font-mono text-xs">{job.job_id}</p>
                    <p className="text-sm text-muted-foreground">
                      mode: <span className="font-medium text-foreground">{job.mode}</span> · created: {formatDate(job.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">results {job.result_count}</Badge>
                    <JobStatusBadge status={job.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {jobId ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Job detail</CardTitle>
                <CardDescription className="font-mono text-xs break-all">{jobId}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/exam-migrations">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to jobs
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.isLoading || results.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : detail.isError || results.isError || !selected ? (
              <p className="text-sm text-red-600">Failed to load selected job.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selected.mode}</Badge>
                  <JobStatusBadge status={selected.status} />
                  <Badge variant="outline">result_count {selected.result_count}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  created {formatDate(selected.created_at)}
                  {selected.started_at ? ` · started ${formatDate(selected.started_at)}` : ''}
                  {selected.finished_at ? ` · finished ${formatDate(selected.finished_at)}` : ''}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Selection</p>
                    <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">
                      {JSON.stringify(selected.selection ?? {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      {mutationData ? 'Mutation result' : 'Run results'}
                    </p>
                    <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">
                      {JSON.stringify(mutationData ?? resultsData ?? [], null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
