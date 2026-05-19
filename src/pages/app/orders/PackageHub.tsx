import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Clock3, Headphones, History, Mic, PenLine, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  clearPracticeStartIdempotencyKey,
  getPracticeStartIdempotencyKey,
  usePackageEntitlements,
  usePracticeHistory,
  useStartPracticeSkill,
} from '@/api/entitlements'
import { clientUUID } from '@/lib/uuid'
import { formatDate } from '@/lib/formatters'
import type { PackageEntitlement, PracticeHistoryItem, PracticeSkill } from '@/types/entitlement'

function quotaLabel(remaining?: number | null) {
  if (remaining == null) return 'Unlimited'
  return `${remaining} left`
}

const LRW_SKILLS: Array<{
  skill: PracticeSkill
  label: string
  icon: typeof Headphones
}> = [
  { skill: 'listening', label: 'Listening', icon: Headphones },
  { skill: 'reading', label: 'Reading', icon: BookOpen },
  { skill: 'writing', label: 'Writing', icon: PenLine },
]

const ALL_SKILLS = [
  { skill: 'listening' as PracticeSkill, label: 'Listening', icon: Headphones },
  { skill: 'reading' as PracticeSkill, label: 'Reading', icon: BookOpen },
  { skill: 'writing' as PracticeSkill, label: 'Writing', icon: PenLine },
  { skill: 'speaking' as PracticeSkill, label: 'Speaking', icon: Mic },
]

const SPEAKING_SKILL = { skill: 'speaking' as PracticeSkill, label: 'Speaking', icon: Mic }

function findSkillAttempt(entitlement: PackageEntitlement, skill: PracticeSkill) {
  return entitlement.skills?.find((attempt) => attempt.skill === skill)
}

function statusBadge(status: PracticeHistoryItem['status']) {
  if (status === 'in_progress') return <Badge variant="outline" className="text-xs">In Progress</Badge>
  if (status === 'submitted') return <Badge variant="secondary" className="text-xs">Submitted</Badge>
  return <Badge className="text-xs">Graded</Badge>
}

function formatHistoryExamLabel(item: PracticeHistoryItem) {
  const parts: string[] = []
  if (item.exam_title?.trim()) parts.push(item.exam_title.trim())
  if (item.exam_code?.trim()) parts.push(`Đề #${item.exam_code.trim()}`)
  if (parts.length > 0) return parts.join(' · ')
  return `Exam ${item.exam_uuid.slice(0, 8)}`
}

type PracticeHistorySectionProps = {
  orderId?: string
  onRedo: (orderId: string, skill: PracticeSkill, examUuid: string) => void
  redoPending: string | null
  startIsPending: boolean
}

function PracticeHistorySection({ orderId, onRedo, redoPending, startIsPending }: PracticeHistorySectionProps) {
  const { data: history, isLoading } = usePracticeHistory()
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const toggleSkill = (skill: string) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev)
      if (next.has(skill)) next.delete(skill)
      else next.add(skill)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  const historyItems = Array.isArray(history) ? history : []
  const hasAnyHistory = historyItems.length > 0

  return (
      <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Practice History
      </div>
      {!hasAnyHistory ? (
        <p className="text-sm text-muted-foreground pl-6">No past attempts yet.</p>
      ) : (
        <div className="space-y-1">
          {ALL_SKILLS.map(({ skill, label, icon: Icon }) => {
            const skillItems = historyItems.filter((h) => h.skill === skill)
            if (skillItems.length === 0) return null
            const isOpen = expandedSkills.has(skill)
            return (
              <div key={skill} className="rounded-md border">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSkill(skill)}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <Badge variant="outline" className="text-xs font-normal">{skillItems.length}</Badge>
                  </span>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="divide-y border-t">
                    {skillItems.map((item) => {
                      const isRedoPending = redoPending === `redo:${orderId}:${skill}:${item.exam_uuid}`
                      return (
                        <div key={item.practice_skill_attempt_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {statusBadge(item.status)}
                              <span className="text-muted-foreground">{formatDate(item.started_at, 'datetime')}</span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground" title={formatHistoryExamLabel(item)}>
                              {formatHistoryExamLabel(item)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.status === 'in_progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/app/practice/session/${item.practice_attempt_id}`)}
                              >
                                Continue
                              </Button>
                            )}
                            {item.can_view_result && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/app/practice/results/${item.practice_attempt_id}`}>
                                  View result
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!orderId || isRedoPending || startIsPending}
                              onClick={() => orderId && onRedo(orderId, item.skill, item.exam_uuid)}
                            >
                              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRedoPending ? 'animate-spin' : ''}`} />
                              Redo
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PackageHub() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = usePackageEntitlements()
  const startSkill = useStartPracticeSkill()
  const [pendingSkill, setPendingSkill] = useState<string | null>(null)
  const [redoPending, setRedoPending] = useState<string | null>(null)

  const handleStart = async (orderId: string, skill: PracticeSkill, examUuid?: string) => {
    const pendingKey = `${orderId}:${skill}`
    setPendingSkill(pendingKey)
    try {
      const result = await startSkill.mutateAsync({
        orderId,
        skill,
        idempotencyKey: getPracticeStartIdempotencyKey(orderId, skill),
        examUuid,
      })
      const practiceAttemptId = result.practice_attempt_id

      if (!practiceAttemptId) throw new Error('No practice_attempt_id in response')
      clearPracticeStartIdempotencyKey(orderId, skill)
      navigate(`/app/practice/session/${practiceAttemptId}`)
    } catch (startError) {
      toast.error('Could not start attempt', {
        description:
          startError instanceof Error ? startError.message : 'Please try again.',
      })
    } finally {
      setPendingSkill(null)
    }
  }

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
              Start Listening, Reading, Writing, or Speaking practice from active package entitlements.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
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
          <div className="space-y-4">
            <PracticeHistorySection
              orderId={redoOrderId}
              onRedo={handleRedo}
              redoPending={redoPending}
              startIsPending={startSkill.isPending}
            />

            {data.map((entitlement) => (
              <div
                key={entitlement.order_id}
                className="rounded-lg border bg-card p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Order #{entitlement.order_id}</h2>
                    <p className="text-sm text-muted-foreground">
                      Expires {formatDate(entitlement.expires_at, 'datetime')}
                    </p>
                  </div>
                  <Badge variant="secondary">Package</Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
                  <div className="rounded-md border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        <PenLine className="h-4 w-4" />
                        LRW Practice
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {entitlement.lrw_enabled
                          ? quotaLabel(entitlement.lrw_remaining)
                          : 'Disabled'}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {LRW_SKILLS.map(({ skill, label, icon: Icon }) => {
                        const skillAttempt = findSkillAttempt(entitlement, skill)
                        const isResumable = skillAttempt?.status === 'in_progress' && skillAttempt.practice_attempt_id
                        const isPending = pendingSkill === `${entitlement.order_id}:${skill}`
                        const disabled =
                          !entitlement.lrw_enabled ||
                          (entitlement.lrw_remaining != null &&
                            entitlement.lrw_remaining <= 0) ||
                          isPending ||
                          startSkill.isPending

                        return (
                          <div key={skill} className="space-y-2">
                            <Button
                              className="w-full"
                              variant={isResumable ? 'secondary' : 'default'}
                              disabled={disabled}
                              onClick={() => {
                                if (isResumable && skillAttempt?.practice_attempt_id) {
                                  navigate(`/app/practice/session/${skillAttempt.practice_attempt_id}`)
                                  return
                                }
                                handleStart(entitlement.order_id, skill)
                              }}
                            >
                              <Icon className="mr-2 h-4 w-4" />
                              {isResumable ? 'Resume' : 'Start'} {label}
                            </Button>
                            {skillAttempt?.can_view_result && skillAttempt.practice_attempt_id && (
                              <Button variant="ghost" size="sm" className="w-full" asChild>
                                <Link to={`/app/practice/results/${skillAttempt.practice_attempt_id}`}>
                                  View result
                                </Link>
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        <Mic className="h-4 w-4" />
                        Speaking
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {entitlement.speaking_enabled
                          ? quotaLabel(entitlement.speaking_remaining)
                          : 'Disabled'}
                      </span>
                    </div>
                    {(() => {
                      const skillAttempt = findSkillAttempt(entitlement, SPEAKING_SKILL.skill)
                      const isResumable = skillAttempt?.status === 'in_progress' && skillAttempt.practice_attempt_id
                      const isPending = pendingSkill === `${entitlement.order_id}:${SPEAKING_SKILL.skill}`
                      return (
                        <div className="space-y-2">
                          <Button
                            className="w-full"
                            variant={isResumable ? 'secondary' : 'default'}
                            disabled={
                              !entitlement.speaking_enabled ||
                              (entitlement.speaking_remaining != null &&
                                entitlement.speaking_remaining <= 0) ||
                              isPending ||
                              startSkill.isPending
                            }
                            onClick={() => {
                              if (isResumable && skillAttempt?.practice_attempt_id) {
                                navigate(`/app/practice/session/${skillAttempt.practice_attempt_id}`)
                                return
                              }
                              handleStart(entitlement.order_id, SPEAKING_SKILL.skill)
                            }}
                          >
                            <Mic className="mr-2 h-4 w-4" />
                            {isResumable ? 'Resume' : 'Start'} Speaking
                          </Button>
                          {skillAttempt?.can_view_result && skillAttempt.practice_attempt_id && (
                            <Button variant="ghost" size="sm" className="w-full" asChild>
                              <Link to={`/app/practice/results/${skillAttempt.practice_attempt_id}`}>
                                View result
                              </Link>
                            </Button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Product {entitlement.product_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
