import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Braces,
  ExternalLink,
  Headphones,
  KeyRound,
  Loader2,
  ScrollText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useExamArtifactPresignMutation,
  useExamBankDetail,
  useExamGradingFetchMutation,
  useExamManifestFetchMutation,
  useExamPlayPresignMutation,
} from '@/api/exams'
import { formatDate } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
function collectS3KeysDeep(node: unknown, out: Set<string>): void {
  if (node === null || node === undefined) return
  if (typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) collectS3KeysDeep(item, out)
    return
  }
  const o = node as Record<string, unknown>
  const sk = o.s3_key
  if (typeof sk === 'string' && sk.trim()) out.add(sk.trim())
  for (const v of Object.values(o)) collectS3KeysDeep(v, out)
}

const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|aac|webm)(\?|$)/i

function ListeningMediaList({ examId, mediaKeys }: { examId: string; mediaKeys: string[] }) {
  const presignAsset = useExamArtifactPresignMutation()
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const resolve = async (key: string) => {
    setLoadingKey(key)
    try {
      const p = await presignAsset.mutateAsync({ examId, s3Key: key })
      setUrls((prev) => ({ ...prev, [key]: p.url }))
    } catch {
      /* toast via axios */
    } finally {
      setLoadingKey(null)
    }
  }

  if (mediaKeys.length === 0) return null

  return (
    <ul className="space-y-4 mt-2">
      {mediaKeys.map((key) => {
        const url = urls[key]
        const isAudio = AUDIO_EXT.test(key)
        const busy = loadingKey === key
        return (
          <li key={key} className="rounded-md border p-3 space-y-2">
            <p className="font-mono text-xs break-all text-muted-foreground">{key}</p>
            {!url ? (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void resolve(key)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Headphones className="mr-2 h-4 w-4" />}
                Presign & load
              </Button>
            ) : isAudio ? (
              <audio controls className="w-full max-w-md" src={url} preload="metadata">
                <track kind="captions" />
              </audio>
            ) : (
              <Button type="button" size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open file
                </a>
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function ExamBankDetailPage() {
  const { id } = useParams<{ id: string }>()
  const examId = id ? decodeURIComponent(id) : undefined

  const { data: exam, isLoading, error, isError } = useExamBankDetail(examId)
  const presign = useExamPlayPresignMutation()
  const fetchGrading = useExamGradingFetchMutation()
  const fetchManifest = useExamManifestFetchMutation()

  const [jsonDialog, setJsonDialog] = useState<{ title: string; json: string } | null>(null)
  const [mediaKeys, setMediaKeys] = useState<string[] | null>(null)
  const [mediaScanError, setMediaScanError] = useState<string | null>(null)

  const openPlayJson = async () => {
    if (!examId) return
    try {
      const p = await presign.mutateAsync(examId)
      window.open(p.url, '_blank', 'noopener,noreferrer')
    } catch {
      // axios interceptor toasts
    }
  }

  const openJsonDialog = (title: string, data: Record<string, unknown>) => {
    setJsonDialog({ title, json: JSON.stringify(data, null, 2) })
  }

  const loadGradingView = async () => {
    if (!examId) return
    try {
      const data = await fetchGrading.mutateAsync(examId)
      openJsonDialog('grading.json', data)
    } catch {
      /* toast */
    }
  }

  const loadManifestView = async () => {
    if (!examId) return
    try {
      const data = await fetchManifest.mutateAsync(examId)
      openJsonDialog('manifest.json', data)
    } catch {
      /* toast */
    }
  }

  const scanPlayForMedia = useCallback(async () => {
    if (!examId || !exam) return
    setMediaScanError(null)
    setMediaKeys(null)
    try {
      const p = await presign.mutateAsync(examId)
      const res = await fetch(p.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const play = (await res.json()) as unknown
      const found = new Set<string>()
      collectS3KeysDeep(play, found)
      const skip = new Set(
        [exam.play_s3_key, exam.grading_s3_key, exam.manifest_s3_key].filter(
          (k): k is string => typeof k === 'string' && !!k.trim(),
        ),
      )
      const list = [...found].filter((k) => !skip.has(k)).sort()
      setMediaKeys(list)
      if (list.length === 0) {
        setMediaScanError('No s3_key references found in play.json besides artifact pointers.')
      }
    } catch (e) {
      setMediaScanError((e as Error)?.message || 'Failed to load play.json')
    }
  }, [exam, examId, presign])

  const manifestDisplay = useMemo(() => {
    if (!exam) return '—'
    const m = exam.manifest_s3_key?.trim()
    if (m) return m
    if (exam.play_s3_key?.includes('play.json')) {
      return exam.play_s3_key.replace('play.json', 'manifest.json')
    }
    return '—'
  }, [exam])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !exam) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/exams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to exam bank
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Exam not found</CardTitle>
            <CardDescription>
              {(error as Error)?.message ||
                'No registry row for this id, or exam-service unreachable.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/exams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="h-7 w-7 text-muted-foreground" />
          Exam registry
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1 break-all">{exam.exam_id}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{exam.exam_type}</Badge>
        {exam.status ? <Badge variant="outline">{exam.status}</Badge> : null}
        {exam.exam_uuid ? (
          <Badge variant="outline" className="font-mono text-xs">
            uuid {exam.exam_uuid}
          </Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Artifact pointers</CardTitle>
          <CardDescription>
            Keys in object storage for this published revision. Full authoring workflow remains
            migrate/pointer APIs on exam-service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              play.json
            </p>
            <p className="font-mono text-sm break-all mt-1">{exam.play_s3_key}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              grading.json
            </p>
            <p className="font-mono text-sm break-all mt-1">
              {exam.grading_s3_key?.trim() ? exam.grading_s3_key : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              manifest.json
            </p>
            <p className="font-mono text-sm break-all mt-1">{manifestDisplay}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Updated
            </p>
            <p className="text-sm mt-1">{formatDate(exam.updated_at)}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="default"
              disabled={presign.isPending}
              onClick={() => void openPlayJson()}
            >
              {presign.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Open play.json (presigned)
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={fetchGrading.isPending}
              onClick={() => void loadGradingView()}
            >
              {fetchGrading.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Braces className="mr-2 h-4 w-4" />
              )}
              View grading JSON
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={fetchManifest.isPending}
              onClick={() => void loadManifestView()}
            >
              {fetchManifest.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Braces className="mr-2 h-4 w-4" />
              )}
              View manifest JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={presign.isPending}
              onClick={() => void scanPlayForMedia()}
            >
              <Headphones className="mr-2 h-4 w-4" />
              Scan play.json for media
            </Button>
            <p className="text-xs text-muted-foreground w-full">
              Grading uses worker-capable roles; manifest and artifact presign require system_admin. S3 must be
              configured for presigned URLs.
            </p>
          </div>
        </CardContent>
      </Card>

      {mediaScanError ? (
        <p className="text-sm text-destructive">{mediaScanError}</p>
      ) : null}
      {mediaKeys && mediaKeys.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Media from play.json
            </CardTitle>
            <CardDescription>
              Presign each object, then use the inline player (listening) or open in a new tab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListeningMediaList examId={examId!} mediaKeys={mediaKeys} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Related APIs
          </CardTitle>
          <CardDescription className="font-mono text-xs leading-relaxed">
            GET /api/v1/exams/{'{exam_id}'}/grading · /manifest · /play · /artifact-presign?s3_key=
          </CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={!!jsonDialog} onOpenChange={(open) => !open && setJsonDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{jsonDialog?.title ?? 'JSON'}</DialogTitle>
            <DialogDescription>Read-only payload from exam-service.</DialogDescription>
          </DialogHeader>
          <pre className="text-xs font-mono overflow-auto flex-1 min-h-[200px] max-h-[65vh] rounded-md border bg-muted/40 p-3 whitespace-pre-wrap break-all">
            {jsonDialog?.json ?? ''}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
