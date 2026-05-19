import { useState } from 'react'
import { useTrialQueueItem, useTrialApprove, useTrialAudioURL, type TrialSkill } from '@/api/trialExam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface TrialSpeakingGraderProps {
  queueId: string
  sessionId: string
  skill: TrialSkill
  onApproved?: () => void
}

export function TrialSpeakingGrader({ queueId, sessionId, skill, onApproved }: TrialSpeakingGraderProps) {
  const navigate = useNavigate()
  const { data: item, isLoading } = useTrialQueueItem(queueId)
  const approveMutation = useTrialApprove()
  const { data: audioUrl, isLoading: audioLoading } = useTrialAudioURL(
    queueId,
    skill === 'speaking' && !!item?.audio_key,
  )

  const [bandScore, setBandScore] = useState<number[]>([6.0])
  const [comments, setComments] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  if (!item) {
    return <p className="text-muted-foreground">Queue item not found.</p>
  }

  const isInReview = item.status === 'in_review'
  const isPending = item.status === 'pending'
  const isApproved = item.status === 'approved'

  const handleApprove = async () => {
    await approveMutation.mutateAsync({
      queueId,
      data: {
        band_score: bandScore[0],
        comments,
      },
    })
    onApproved?.()
    navigate('/admin/grading/trial')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold capitalize">{skill} Grading</h2>
          <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
        </div>
        <Badge
          variant={
            isApproved ? 'default' : isInReview ? 'secondary' : 'outline'
          }
          className="capitalize"
        >
          {item.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Audio Player Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isApproved ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Recording reviewed and approved</span>
            </div>
          ) : audioLoading ? (
            <div className="flex items-center justify-center h-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading audio...
            </div>
          ) : audioUrl ? (
            <audio src={audioUrl} controls className="w-full h-10" />
          ) : (
            <div className="flex h-10 items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground text-sm">
              No audio recording available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Band Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Band Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Slider
              value={bandScore}
              onValueChange={setBandScore}
              min={0}
              max={9}
              step={0.5}
              disabled={isApproved}
              className="flex-1"
            />
            <span className="w-12 text-right text-lg font-bold">{bandScore[0].toFixed(1)}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {[4, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((score) => (
              <Button
                key={score}
                variant={bandScore[0] === score ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBandScore([score])}
                disabled={isApproved}
                className="h-7 px-2 text-xs"
              >
                {score}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teacher Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Optional feedback for the student..."
            rows={4}
            disabled={isApproved}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {!isApproved && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || isPending}
            className="gap-2"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Approve &amp; Notify Student
          </Button>
          {isPending && (
            <p className="text-sm text-muted-foreground">
              Pick this item first to start grading.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
