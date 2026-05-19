import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useExamBankListInfinite, type ExamFilters } from '@/api/exams'
import { formatDate } from '@/lib/utils'

const EXAM_TYPES = ['listening', 'reading', 'writing', 'speaking'] as const
const STATUSES = ['publish', 'private', 'pending', 'reject', 'achieve'] as const

export default function ExamBankListPage() {
  const [qInput, setQInput] = useState('')
  const [applied, setApplied] = useState<Omit<ExamFilters, 'cursor'>>({ limit: 50 })

  const baseFilters = useMemo(
    () => ({
      ...applied,
      q: applied.q?.trim() || undefined,
    }),
    [applied],
  )

  const {
    data,
    isLoading,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useExamBankListInfinite(baseFilters)

  const rows = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data?.pages])

  const applySearch = () => {
    setApplied((prev) => ({ ...prev, q: qInput.trim() || undefined }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam bank</h1>
          <p className="text-sm text-muted-foreground">
            Published exams in the global registry (artifact pointers). Requires system admin;
            same data as <code className="text-xs">GET /api/v1/exams</code>.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exam id / uuid…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className="pl-9"
              />
            </div>
              <Select
              value={applied.type ?? '__any'}
              onValueChange={(v) =>
                setApplied((prev) => ({
                  ...prev,
                  type: v === '__any' ? undefined : v,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Exam type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any type</SelectItem>
                {EXAM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              <Select
              value={applied.status ?? '__any'}
              onValueChange={(v) =>
                setApplied((prev) => ({
                  ...prev,
                  status: v === '__any' ? undefined : v,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any status</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" onClick={applySearch}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Could not load exam bank</p>
              <p className="text-muted-foreground mt-1">
                {(error as Error)?.message || 'Check gateway + exam-service, and system_admin JWT.'}
              </p>
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ScrollText className="h-10 w-10 opacity-40 mb-2" />
              <p>No exams in registry for these filters.</p>
            </div>
          )}
          {!isLoading && !isError && rows.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.exam_id}>
                      <TableCell className="font-mono text-xs max-w-[220px] truncate">
                        {row.exam_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.exam_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {row.status ? (
                          <Badge variant="outline">{row.status}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(row.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/admin/exams/${encodeURIComponent(row.exam_id)}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasNextPage ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    disabled={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
