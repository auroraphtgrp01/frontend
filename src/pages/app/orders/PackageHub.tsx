import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronRight, Headphones, Mic, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  usePackageEntitlements,
  useStartPracticeSkill,
} from '@/api/entitlements'
import { clientUUID } from '@/lib/uuid'
import { formatDate } from '@/lib/formatters'
import type { PracticeSkill } from '@/types/entitlement'
import { PracticeHistorySection } from '@/pages/app/orders/package-practice-history'
import { quotaLabel } from '@/pages/app/orders/package-practice-shared'

export default function PackageHub() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = usePackageEntitlements()
  const startSkill = useStartPracticeSkill()
  const [redoPending, setRedoPending] = useState<string | null>(null)
  const redoOrderId = data?.find((item) => item.lrw_enabled || item.speaking_enabled)?.order_id

  const handleRedo = async (orderId: string, skill: PracticeSkill, examUuid: string) => {
    const redoKey = `redo:${orderId}:${skill}:${examUuid}`
    setRedoPending(redoKey)
    try {
      const result = await startSkill.mutateAsync({
        orderId,
        skill,
        idempotencyKey: `practice-redo:${orderId}:${skill}:${examUuid}:${clientUUID()}`,
        examUuid,
      })
      const practiceAttemptId = result.practice_attempt_id
      if (!practiceAttemptId) throw new Error('No practice_attempt_id in response')
      navigate(`/app/practice/session/${practiceAttemptId}`)
    } catch (redoError) {
      toast.error('Could not redo attempt', {
        description: redoError instanceof Error ? redoError.message : 'Please try again.',
      })
    } finally {
      setRedoPending(null)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Packages</h1>
            <p className="text-sm text-muted-foreground">
              Active practice packages. Open a package to start or resume skills.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load entitlements.'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : !data?.length ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">No active package entitlements yet.</p>
            <Button className="mt-4" asChild>
              <Link to="/app/products">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
            {data.map((item) => (
              <Link
                key={item.id}
                to={`/app/packages/${item.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border bg-card p-5 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 space-y-1">
                  <h2 className="font-semibold truncate">
                    {item.product_name?.trim() || `Order #${item.order_id.slice(0, 8)}`}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(item.starts_at, 'datetime')} → {formatDate(item.expires_at, 'datetime')}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.lrw_enabled && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Headphones className="h-3 w-3" />
                        <BookOpen className="h-3 w-3" />
                        <PenLine className="h-3 w-3" />
                        LRW · {quotaLabel(item.lrw_remaining)}
                      </Badge>
                    )}
                    {item.speaking_enabled && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Mic className="h-3 w-3" />
                        Speaking · {quotaLabel(item.speaking_remaining)}
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            </div>

            <PracticeHistorySection
              orderId={redoOrderId}
              onRedo={handleRedo}
              redoPending={redoPending}
              startIsPending={startSkill.isPending}
            />
          </div>
        )}
      </div>
    </div>
  )
}
