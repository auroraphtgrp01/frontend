import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mic, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  clearPracticeStartIdempotencyKey,
  getPracticeStartIdempotencyKey,
  usePackageEntitlementDetail,
  useStartPracticeSkill,
} from '@/api/entitlements'
import { clientUUID } from '@/lib/uuid'
import { formatDate } from '@/lib/formatters'
import type { PracticeSkill } from '@/types/entitlement'
import { PracticeHistorySection } from '@/pages/app/orders/package-practice-history'
import {
  findSkillAttempt,
  LRW_SKILLS,
  PART_OPTIONS_BY_SKILL,
  quotaLabel,
  SPEAKING_SKILL,
} from '@/pages/app/orders/package-practice-shared'

type PartPickerState = {
  open: boolean
  orderId: string
  skill: PracticeSkill | null
}

export default function PackageEntitlementDetailPage() {
  const { entitlementId } = useParams<{ entitlementId: string }>()
  const navigate = useNavigate()
  const { data: entitlement, isLoading, isError, error, refetch } = usePackageEntitlementDetail(entitlementId)
  const startSkill = useStartPracticeSkill()
  const [pendingSkill, setPendingSkill] = useState<string | null>(null)
  const [redoPending, setRedoPending] = useState<string | null>(null)
  const [partPicker, setPartPicker] = useState<PartPickerState>({
    open: false,
    orderId: '',
    skill: null,
  })
  const [selectedParts, setSelectedParts] = useState<number[]>([])

  const handleStart = async (
    orderId: string,
    skill: PracticeSkill,
    examUuid?: string,
    parts?: number[],
  ) => {
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
      const selected = Array.isArray(parts)
        ? [...new Set(parts)].filter((part) => Number.isInteger(part) && part > 0).sort((a, b) => a - b)
        : []
      if (selected.length > 0) {
        navigate(`/app/practice/session/${practiceAttemptId}?parts=${selected.join(',')}`)
      } else {
        navigate(`/app/practice/session/${practiceAttemptId}`)
      }
    } catch (startError) {
      toast.error('Could not start attempt', {
        description: startError instanceof Error ? startError.message : 'Please try again.',
      })
    } finally {
      setPendingSkill(null)
    }
  }

  const openPartPicker = (orderId: string, skill: PracticeSkill) => {
    const availableParts = PART_OPTIONS_BY_SKILL[skill]
    if (!availableParts || availableParts.length === 0) {
      void handleStart(orderId, skill)
      return
    }
    setPartPicker({ open: true, orderId, skill })
    setSelectedParts([...availableParts])
  }

  const closePartPicker = () => {
    setPartPicker({ open: false, orderId: '', skill: null })
    setSelectedParts([])
  }

  const togglePart = (part: number) => {
    setSelectedParts((prev) => {
      if (prev.includes(part)) return prev.filter((item) => item !== part)
      return [...prev, part].sort((a, b) => a - b)
    })
  }

  const handleConfirmPartStart = async () => {
    if (!partPicker.skill || !partPicker.orderId || selectedParts.length === 0) return
    const skill = partPicker.skill
    const orderId = partPicker.orderId
    const parts = [...selectedParts]
    closePartPicker()
    await handleStart(orderId, skill, undefined, parts)
  }

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
            <Link to="/app/packages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              My Packages
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : isError || !entitlement ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load package detail.'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">
                  {entitlement.product_name?.trim() || 'Practice package'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Active {formatDate(entitlement.starts_at, 'datetime')} · Expires{' '}
                  {formatDate(entitlement.expires_at, 'datetime')}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Order {entitlement.order_id}
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
                    {entitlement.lrw_enabled ? quotaLabel(entitlement.lrw_remaining) : 'Disabled'}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {LRW_SKILLS.map(({ skill, label, icon: Icon }) => {
                    const skillAttempt = findSkillAttempt(entitlement, skill)
                    const isResumable =
                      skillAttempt?.status === 'in_progress' && skillAttempt.practice_attempt_id
                    const isPending = pendingSkill === `${entitlement.order_id}:${skill}`
                    const disabled =
                      !entitlement.lrw_enabled ||
                      (entitlement.lrw_remaining != null && entitlement.lrw_remaining <= 0) ||
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
                            openPartPicker(entitlement.order_id, skill)
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
                  const isResumable =
                    skillAttempt?.status === 'in_progress' && skillAttempt.practice_attempt_id
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
                          void handleStart(entitlement.order_id, SPEAKING_SKILL.skill)
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

            {entitlement.skills.length > 0 && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Resume or review</p>
                {entitlement.skills.map((skill) => (
                  <p key={`${entitlement.order_id}:${skill.skill}`}>
                    {skill.skill}: {skill.status}
                    {skill.status === 'in_progress' ? ' — use Resume on that skill' : ''}
                    {skill.can_view_result ? ' — result ready' : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {entitlement && !isLoading && !isError && (
          <PracticeHistorySection
            orderId={entitlement.order_id}
            onRedo={handleRedo}
            redoPending={redoPending}
            startIsPending={startSkill.isPending}
          />
        )}
      </div>

      <Dialog open={partPicker.open} onOpenChange={(open) => !open && closePartPicker()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select parts</DialogTitle>
            <DialogDescription>
              {partPicker.skill === 'writing'
                ? 'Choose Part 1, Part 2, or both before starting Writing.'
                : 'Choose one or more parts to practice, or select all.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(partPicker.skill ? PART_OPTIONS_BY_SKILL[partPicker.skill] : undefined)?.map((part) => {
                const isSelected = selectedParts.includes(part)
                return (
                  <Button
                    key={part}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => togglePart(part)}
                  >
                    Part {part}
                  </Button>
                )
              })}
            </div>
            {partPicker.skill && PART_OPTIONS_BY_SKILL[partPicker.skill] && (
              <Button
                type="button"
                variant="ghost"
                className="px-0"
                onClick={() => setSelectedParts([...(PART_OPTIONS_BY_SKILL[partPicker.skill] ?? [])])}
              >
                Select all
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePartPicker}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmPartStart()}
              disabled={selectedParts.length === 0}
            >
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
