import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Clock, TrendingUp } from 'lucide-react'
import type { ExamResult } from '@/types/exam'
import { formatDate } from '@/lib/utils'

interface ExamHistoryCardProps {
  results: ExamResult[]
  loading?: boolean
}

function getBandColor(band: number): string {
  if (band >= 7.5) return 'text-green-600 dark:text-green-400'
  if (band >= 6.5) return 'text-emerald-600 dark:text-emerald-400'
  if (band >= 5.5) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getBandBgColor(band: number): string {
  if (band >= 7.5) return 'bg-green-100 dark:bg-green-900'
  if (band >= 6.5) return 'bg-emerald-100 dark:bg-emerald-900'
  if (band >= 5.5) return 'bg-yellow-100 dark:bg-yellow-900'
  return 'bg-red-100 dark:bg-red-900'
}

export function ExamHistoryCard({ results, loading = false }: ExamHistoryCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
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

  if (!results?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">No exam results yet</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/app/exams">Start an Exam</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Exam Results</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/results">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.slice(0, 5).map((result) => (
            <Link
              key={result.id}
              to={`/app/results/${result.id}/detail`}
              className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full font-bold ${
                  result.overall_band > 0
                    ? `${getBandBgColor(result.overall_band)} ${getBandColor(result.overall_band)}`
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {result.overall_band > 0 ? result.overall_band.toFixed(1) : '—'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">Band Score</p>
                  <Badge variant={result.visible ? 'success' : 'secondary'} className="text-xs">
                    {result.visible ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(result.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {['L', 'R', 'W', 'S'].map((skill, i) => {
            const bands = [
              results[0]?.listening_band,
              results[0]?.reading_band,
              results[0]?.writing_band,
              results[0]?.speaking_band,
            ]
            const band = bands[i]
            return (
              <div key={skill} className="text-center">
                <p className="text-xs text-muted-foreground">{skill}</p>
                <p className={`font-semibold ${band && band > 0 ? getBandColor(band) : 'text-muted-foreground'}`}>
                  {band && band > 0 ? band.toFixed(1) : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
